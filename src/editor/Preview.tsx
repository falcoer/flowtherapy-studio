import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { resolveSupport } from "../domain/core.js";
import type {
  Campaign,
  EventRow,
  Layer,
  Placement,
  Value,
} from "../domain/model.js";
import type { CampaignBundle } from "../storage/indexeddb.js";

function valueOf(
  layer: Layer,
  fields: Record<string, Value>,
): Value | undefined {
  if ("source" in layer) return fields[layer.source.field];
  if ("content" in layer)
    return "field" in layer.content
      ? fields[layer.content.field]
      : layer.content.value;
}
function color(c: Campaign, value?: string) {
  const candidate = value?.startsWith("brand:")
    ? c.brand?.colors[value.slice(6)]
    : value;
  return candidate && CSS.supports("color", candidate) ? candidate : "#173943";
}
function ImageLayer({
  bundle,
  value,
  placement,
}: {
  bundle: CampaignBundle;
  value?: Value;
  placement: Placement;
}) {
  const asset =
    value && typeof value === "object" && !Array.isArray(value)
      ? bundle.campaign.assets.find((a) => a.id === value.assetId)
      : undefined;
  const bytes = asset && bundle.assets.get(asset.path);
  const [url, setURL] = useState(""),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (
      !bytes ||
      !asset ||
      !["image/png", "image/jpeg"].includes(asset.mimeType)
    ) {
      setURL("");
      return;
    }
    const next = URL.createObjectURL(
      new Blob([new Uint8Array(bytes)], { type: asset.mimeType }),
    );
    setURL(next);
    return () => URL.revokeObjectURL(next);
  }, [bytes, asset?.mimeType]);
  const fit = placement.imageFit ?? { mode: "cover", focalX: 0.5, focalY: 0.5 };
  return url && !failed ? (
    <img
      alt="Image de la composition"
      draggable={false}
      src={url}
      onError={() => setFailed(true)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: fit.mode,
        objectPosition: `${fit.focalX * 100}% ${fit.focalY * 100}%`,
      }}
    />
  ) : (
    <span className="missing">
      {failed
        ? "Image illisible"
        : "Image manquante — importer le ZIP avec ses ressources"}
    </span>
  );
}
export function Preview({
  bundle,
  supportId,
  variantId,
  selected,
  select,
  move,
}: {
  bundle: CampaignBundle;
  supportId: string;
  variantId: string;
  selected: string;
  select: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(600);
  const [overflow, setOverflow] = useState<string[]>([]);
  const [drag, setDrag] = useState<{
    id: string;
    x: number;
    y: number;
    startX: number;
    startY: number;
    dx: number;
    dy: number;
  } | null>(null);
  const campaign = bundle.campaign,
    support = campaign.supports.find((s) => s.id === supportId);
  let result: ReturnType<typeof resolveSupport> | undefined,
    error = "";
  try {
    if (support) result = resolveSupport(campaign, support.id);
  } catch (e) {
    error = String(e);
  }
  const variant = result?.variants.find((v) => v.id === variantId),
    surface = variant?.format.surface;
  const scale = surface ? width / surface.width : 1;
  useLayoutEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(1, entries[0].contentRect.width)),
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const elements =
      host.current?.querySelectorAll<HTMLElement>("[data-layer]") ?? [];
    setOverflow(
      Array.from(elements)
        .filter(
          (el) =>
            el.scrollHeight > el.clientHeight + 1 ||
            el.scrollWidth > el.clientWidth + 1,
        )
        .map((el) => el.dataset.layer!),
    );
  }, [bundle, variantId, width]);
  const warnings: string[] = [];
  if (variant && surface && support)
    for (const p of variant.placements) {
      if (!p.visible) continue;
      const layer = support.template.layers.find((l) => l.id === p.layerId)!;
      const { x, y, width: w, height: h } = p.frame;
      if (
        x < 0 ||
        y < 0 ||
        x + w > surface.width ||
        y + h > surface.height ||
        p.rotation !== 0
      )
        warnings.push(
          `${p.layerId} : vérifier les limites de la surface${p.rotation ? " après rotation" : ""}.`,
        );
      if (overflow.includes(p.layerId))
        warnings.push(
          `${p.layerId} : contenu débordant, entièrement conservé. Agrandir le cadre ; pagination non disponible.`,
        );
      if (layer.type === "qr" || layer.type === "vector")
        warnings.push(
          `${p.layerId} : aperçu ${layer.type} non pris en charge.`,
        );
      if (layer.style?.font || p.style?.font)
        warnings.push(`${p.layerId} : police de substitution dans cet aperçu.`);
      if (layer.type === "image") {
        const v = valueOf(layer, result!.fields),
          a =
            v &&
            typeof v === "object" &&
            !Array.isArray(v) &&
            campaign.assets.find((a) => a.id === v.assetId);
        if (!a || !bundle.assets.has(a.path))
          warnings.push(`${p.layerId} : image manquante.`);
      }
    }
  return (
    <>
      <div ref={host} className="preview-host">
        {!surface || !variant || !support ? (
          <div className="empty-preview">
            <span>FT</span>
            <h2>Votre prochaine campagne</h2>
            <p>
              {error ||
                "Saisissez un événement, puis activez un template pour composer votre premier support."}
            </p>
          </div>
        ) : (
          <div
            className="surface-wrap"
            style={{ height: surface.height * scale }}
          >
            <div
              className="surface"
              style={{
                width: surface.width,
                height: surface.height,
                transform: `scale(${scale})`,
              }}
            >
              {variant.placements
                .filter((p) => p.visible)
                .map((p) => {
                  const layer = support.template.layers.find(
                      (l) => l.id === p.layerId,
                    )!,
                    value = valueOf(layer, result!.fields);
                  const style = { ...layer.style, ...p.style },
                    frame = p.frame;
                  const css: CSSProperties = {
                    left: frame.x + (drag?.id === layer.id ? drag.dx : 0),
                    top: frame.y + (drag?.id === layer.id ? drag.dy : 0),
                    width: frame.width,
                    height: frame.height,
                    transform: `rotate(${p.rotation}deg)`,
                    fontSize: style.fontSize ?? surface.width * 0.03,
                    color: color(campaign, style.fill),
                    textAlign: style.align,
                    borderRadius:
                      layer.type === "shape" && layer.shape === "ellipse"
                        ? "50%"
                        : undefined,
                    background:
                      layer.type === "shape"
                        ? color(campaign, style.fill)
                        : undefined,
                    outlineWidth: selected === layer.id ? 2 / scale : 0,
                  };
                  return (
                    <div
                      key={layer.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Calque ${layer.id}`}
                      aria-pressed={selected === layer.id}
                      data-layer={layer.id}
                      className={`layer ${selected === layer.id ? "selected" : ""}`}
                      style={css}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          select(layer.id);
                        }
                        if (
                          layer.editing.move &&
                          [
                            "ArrowLeft",
                            "ArrowRight",
                            "ArrowUp",
                            "ArrowDown",
                          ].includes(e.key)
                        ) {
                          e.preventDefault();
                          const step = e.shiftKey ? 10 : 1;
                          move(
                            layer.id,
                            frame.x +
                              (e.key === "ArrowLeft"
                                ? -step
                                : e.key === "ArrowRight"
                                  ? step
                                  : 0),
                            frame.y +
                              (e.key === "ArrowUp"
                                ? -step
                                : e.key === "ArrowDown"
                                  ? step
                                  : 0),
                          );
                        }
                      }}
                      onPointerDown={(e) => {
                        select(layer.id);
                        if (!layer.editing.move) return;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setDrag({
                          id: layer.id,
                          x: frame.x,
                          y: frame.y,
                          startX: e.clientX,
                          startY: e.clientY,
                          dx: 0,
                          dy: 0,
                        });
                      }}
                      onPointerMove={(e) => {
                        if (drag?.id === layer.id)
                          setDrag({
                            ...drag,
                            dx: (e.clientX - drag.startX) / scale,
                            dy: (e.clientY - drag.startY) / scale,
                          });
                      }}
                      onPointerCancel={() => setDrag(null)}
                      onPointerUp={(e) => {
                        if (drag?.id === layer.id) {
                          const dx = (e.clientX - drag.startX) / scale,
                            dy = (e.clientY - drag.startY) / scale;
                          if (dx || dy)
                            move(layer.id, drag.x + dx, drag.y + dy);
                          setDrag(null);
                        }
                      }}
                    >
                      {layer.type === "text" ? (
                        typeof value === "string" ? (
                          value
                        ) : (
                          ""
                        )
                      ) : layer.type === "image" ? (
                        <ImageLayer
                          bundle={bundle}
                          value={value}
                          placement={p}
                        />
                      ) : layer.type === "event-list" &&
                        Array.isArray(value) ? (
                        <div className="event-preview">
                          {value.map((event: EventRow) => (
                            <div
                              className="event-preview-row"
                              key={event.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  p.eventPresentation?.mode === "cards"
                                    ? "1fr"
                                    : (p.eventPresentation?.columns
                                        .map((c) => `${c.width}fr`)
                                        .join(" ") ?? "1fr 2fr 2fr"),
                                gap: "0.25em",
                                marginBottom: p.eventPresentation?.rowGap ?? 0,
                              }}
                            >
                              {(
                                p.eventPresentation?.columns ?? [
                                  { field: "date" },
                                  { field: "label" },
                                  { field: "location" },
                                ]
                              ).map((column) => (
                                <span key={column.field}>
                                  {column.field === "date"
                                    ? p.eventPresentation?.dateFormat ===
                                      "day-month"
                                      ? event.date
                                          .slice(5)
                                          .split("-")
                                          .reverse()
                                          .join("/")
                                      : event.date
                                          .split("-")
                                          .reverse()
                                          .join("/")
                                    : event[column.field]}
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : layer.type === "shape" ? null : (
                        <span>Aperçu {layer.type} indisponible</span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
      <p className="preview-note">
        Aperçu de travail · polices système · sans export graphique. Les textes
        débordants restent visibles.
      </p>
      {warnings.length > 0 && (
        <ul className="warnings" aria-label="Avertissements de composition">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </>
  );
}
