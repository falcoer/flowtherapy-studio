import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { resolveSupport } from "../domain/core.js";
import { resolveScene } from "../render/scene.js";
import type { ResolvedScene } from "../render/scene.js";
import type { CampaignBundle } from "../storage/indexeddb.js";
import { SceneContent } from "./SceneContent.js";
import { createBrowserMeasurer, useSceneFonts } from "./sceneFonts.js";
import { downloadBlob, exportSurfaceAsPng } from "./exportPng.js";
import "./scene.css";

export function Preview({ bundle, supportId, variantId, selected, select, move }: {
  bundle: CampaignBundle; supportId: string; variantId: string; selected: string;
  select: (id: string) => void; move: (id: string, x: number, y: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null), surfaceElement = useRef<HTMLDivElement>(null), [width, setWidth] = useState(600);
  const [page, setPage] = useState(0), [guides, setGuides] = useState(false);
  const [exporting, setExporting] = useState(false), [exportError, setExportError] = useState("");
  const [drag, setDrag] = useState<{
    id: string; x: number; y: number; startX: number; startY: number; dx: number; dy: number;
  } | null>(null);
  const fonts = useSceneFonts(bundle);
  const [measure] = useState(createBrowserMeasurer);
  const { scene, error } = useMemo((): { scene?: ResolvedScene; error: string } => {
    try {
      const campaign = bundle.campaign, support = campaign.supports.find((item) => item.id === supportId);
      if (!support) return { error: "" };
      const result = resolveSupport(campaign, supportId), variant = result.variants.find((item) => item.id === variantId);
      return { scene: variant ? resolveScene({ campaign, support, variant, fields: result.fields, fontFamilies: fonts.families }, measure) : undefined, error: "" };
    } catch (e) { return { error: String(e) }; }
  }, [bundle.campaign, supportId, variantId, fonts.families, measure]);
  const surface = scene?.format.surface;
  const scale = surface ? width / surface.width : 1;
  const pageIndex = Math.min(page, (scene?.pages.length ?? 1) - 1);
  const current = scene?.pages[pageIndex];
  useEffect(() => { setPage(0); setDrag(null); setExportError(""); }, [supportId, variantId]);
  useEffect(() => { setPage((value) => Math.min(value, (scene?.pages.length ?? 1) - 1)); }, [scene?.pages.length]);
  useLayoutEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver((entries) => setWidth(Math.max(1, entries[0].contentRect.width)));
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const warnings = [...(scene?.warnings.map((warning) => `${warning.layerId} : ${warning.message}`) ?? []), ...fonts.warnings];
  for (const node of current?.nodes ?? []) {
    if (node.layer.type !== "image") continue;
    const value = node.value;
    const asset = value && typeof value === "object" && !Array.isArray(value)
      ? bundle.campaign.assets.find((item) => item.id === value.assetId) : undefined;
    if (!asset || !bundle.assets.has(asset.path) || !["image/png", "image/jpeg"].includes(asset.mimeType))
      warnings.push(`${node.id} : image manquante ou format non pris en charge.`);
  }
  const safe = scene?.format.zones.safeInset;
  const exportCurrentPage = async () => {
    if (!surface || !surfaceElement.current || exporting) return;
    setExporting(true);
    setExportError("");
    try {
      const physicalScale = surface.unit === "mm" ? 300 / 25.4 : 1;
      const outputWidth = Math.round(surface.width * physicalScale);
      const outputHeight = Math.round(surface.height * physicalScale);
      const blob = await exportSurfaceAsPng(
        surfaceElement.current,
        surface.width,
        surface.height,
        outputWidth,
        outputHeight,
      );
      const campaignName = bundle.campaign.name.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "flow-therapy";
      const suffix = scene && scene.pages.length > 1 ? `-page-${pageIndex + 1}` : "";
      downloadBlob(blob, `${campaignName}-${variantId}${suffix}.png`);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };
  return <>
    {scene && <div className="scene-toolbar" aria-label="Options de l’aperçu">
      <div className="scene-pagination" role="group" aria-label="Pages de la composition">
        <button type="button" aria-label="Page précédente" disabled={pageIndex === 0}
          onClick={() => { setPage(pageIndex - 1); setDrag(null); }}>←</button>
        <span aria-live="polite" data-scene-page>Page {pageIndex + 1} / {scene.pages.length}</span>
        <button type="button" aria-label="Page suivante" disabled={pageIndex >= scene.pages.length - 1}
          onClick={() => { setPage(pageIndex + 1); setDrag(null); }}>→</button>
      </div>
      <button type="button" aria-pressed={guides} onClick={() => setGuides(!guides)}>Zones de sécurité</button>
      <button type="button" data-export-png disabled={!fonts.ready || exporting || !surface}
        onClick={() => void exportCurrentPage()}>{exporting ? "Export PNG…" : "Exporter PNG"}</button>
    </div>}
    <div ref={host} className="preview-host" data-fonts-ready={fonts.ready}>
      {!surface || !scene || !current ? <div className="empty-preview">
        <span>FT</span><h2>Votre prochaine campagne</h2>
        <p>{error || "Saisissez un événement, puis activez un template pour composer votre premier support."}</p>
      </div> : <div className="surface-wrap" style={{ height: surface.height * scale }}>
        <div ref={surfaceElement} className="surface resolved-surface" style={{ width: surface.width, height: surface.height, transform: `scale(${scale})` }}>
          {current.nodes.map((node) => {
            const { layer, placement: placement, id } = node;
            const frame = placement.frame;
            const fill = CSS.supports("color", node.fill) ? node.fill : "#173943";
            const css: CSSProperties = {
              left: frame.x + (drag?.id === id ? drag.dx : 0), top: frame.y + (drag?.id === id ? drag.dy : 0),
              width: frame.width, height: frame.height, transform: `rotate(${placement.rotation}deg)`,
              fontSize: node.fontSize, fontFamily: node.fontFamily, fontWeight: 400, fontKerning: "normal",
              color: fill, textAlign: placement.style?.align ?? layer.style?.align,
              borderRadius: layer.type === "shape" && layer.shape === "ellipse" ? "50%" : undefined,
              background: layer.type === "shape" ? fill : undefined, outlineWidth: selected === id ? 2 / scale : 0,
              cursor: layer.editing.move ? "move" : "pointer",
            };
            return <div key={id} role="button" tabIndex={0} aria-label={`Calque ${id}`} aria-pressed={selected === id}
              data-layer={id} className={`layer ${selected === id ? "selected" : ""}`} style={css}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(id); }
                if (layer.editing.move && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
                  e.preventDefault(); const step = e.shiftKey ? 10 : 1;
                  move(id, frame.x + (e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0),
                    frame.y + (e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0));
                }
              }}
              onPointerDown={(e) => {
                select(id); if (!layer.editing.move) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                setDrag({ id, x: frame.x, y: frame.y, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 });
              }}
              onPointerMove={(e) => {
                if (drag?.id === id) setDrag({ ...drag, dx: (e.clientX - drag.startX) / scale, dy: (e.clientY - drag.startY) / scale });
              }}
              onPointerCancel={() => setDrag(null)}
              onLostPointerCapture={() => setDrag(null)}
              onPointerUp={(e) => {
                if (drag?.id !== id) return;
                const dx = (e.clientX - drag.startX) / scale, dy = (e.clientY - drag.startY) / scale;
                if (dx || dy) move(id, drag.x + dx, drag.y + dy);
                setDrag(null);
              }}>
              <SceneContent node={node} bundle={bundle} />
            </div>;
          })}
          {guides && safe && <div className="scene-guides" aria-hidden="true">
            <div data-safe-area className="scene-safe-area" style={{ left: safe.left, top: safe.top,
              width: surface.width - safe.left - safe.right, height: surface.height - safe.top - safe.bottom, borderWidth: 1 / scale }} />
            {(scene.format.zones.exclusions ?? []).map((zone) => <div key={zone.id} className="scene-exclusion"
              title={zone.label} style={{ left: zone.x, top: zone.y, width: zone.width, height: zone.height, borderWidth: 1 / scale }} />)}
          </div>}
        </div>
      </div>}
    </div>
    <p className="preview-note">
      {fonts.ready ? "Scène résolue · polices de la campagne lorsqu’elles sont disponibles" : "Chargement des polices locales…"}
      {surface?.unit === "mm" ? " · export PNG prototype à 300 dpi." : " · export PNG prototype de la page affichée."}
      {" Les contenus débordants restent visibles et signalés."}
    </p>
    {exportError && <p className="warnings" role="alert">Export PNG : {exportError}</p>}
    {warnings.length > 0 && <ul className="warnings" aria-label="Avertissements de composition">
      {[...new Set(warnings)].map((warning) => <li key={warning}>{warning}</li>)}
    </ul>}
  </>;
}
