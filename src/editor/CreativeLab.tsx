import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { motion, MotionConfig } from "motion/react";
import type { Campaign } from "../domain/model.js";
import {
  campaignDirection,
  clamp,
  directionToRecipe,
  explore,
  harmonies,
  parseRecipe,
  recipes,
  resolveCreative,
  resolveSupportDirection,
} from "../domain/creative.js";
import type { CreativeRecipe } from "../domain/creative.js";
import "./lab.css";

const storageKey = "ft-studio:creative-recipes:v2";
const legacyStorageKey = "ft-studio:creative-recipes:v1";
function CreativePoster({
  recipe,
  campaign,
  format,
  imageUrl,
}: {
  recipe: CreativeRecipe;
  campaign: Campaign;
  format: string;
  imageUrl?: string;
}) {
  const design = resolveCreative(recipe);
  const host = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const events = Object.values(campaign.content).flatMap((value) =>
    Array.isArray(value) ? value : [],
  );
  const title =
    typeof campaign.content.title === "string"
      ? campaign.content.title
      : campaign.name;
  useEffect(() => {
    const measure = () =>
      setOverflow(
        !!host.current &&
          !!content.current &&
          content.current.scrollHeight >
            host.current.clientWidth *
              (format === "story"
                ? 16 / 9
                : format === "poster"
                  ? 297 / 210
                  : 1) +
              2,
      );
    const observer = new ResizeObserver(measure);
    if (host.current) observer.observe(host.current);
    if (content.current) observer.observe(content.current);
    measure();
    return () => observer.disconnect();
  }, [recipe, campaign, format]);
  return (
    <div className="lab-poster-wrap">
      <div
        ref={host}
        className={`lab-poster ${format}`}
        style={
          {
            "--paper": design.background,
            "--ink": design.ink,
            "--accent": design.accent,
            "--color-intensity": design.colorIntensity,
          } as CSSProperties
        }
      >
        <div
          ref={content}
          className={`lab-poster-content dominant-${design.dominant}`}
          style={{
            gap: `${design.gap / 4}cqw`,
            minHeight: `${format === "story" ? 1600 / 9 : format === "poster" ? 29700 / 210 : 100}cqw`,
          }}
        >
          {imageUrl && design.dominant !== "text" && (
            <img
              className={`lab-poster-image dominant-${design.dominant}`}
              src={imageUrl}
              alt="Ressource visuelle de la direction créative"
            />
          )}
          <div className="lab-poster-signature">
            FLOW THERAPY <span>LIVE MUSIC</span>
          </div>
          <h2
            style={{
              fontSize: `${design.titleSize / 4}cqw`,
              transform: `rotate(${design.tilt}deg)`,
            }}
          >
            {title || "Votre titre"}
          </h2>
          <svg className="lab-waves" viewBox="0 0 400 130" aria-hidden="true">
            {Array.from({ length: design.lines }, (_, i) => (
              <path
                key={i}
                d={`M-20 ${25 + i * 10} C80 ${25 + i * 10 - design.amplitude} 110 ${25 + i * 10 + design.amplitude} 190 ${25 + i * 10} S310 ${25 + i * 10 - design.amplitude} 420 ${25 + i * 10}`}
              />
            ))}
          </svg>
          <div
            className="lab-poster-events"
            style={{ gap: `${design.gap / 5}cqw` }}
          >
            {events.length ? (
              events.map((event, index) => (
                <div className="lab-poster-event" key={`${event.id}:${index}`}>
                  <b>{event.date.split("-").reverse().join(".")}</b>
                  <div>
                    <strong>{event.label || "Libellé à compléter"}</strong>
                    <span>{event.location || "Lieu à compléter"}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="lab-empty-events">
                Ajoutez vos dates dans l’onglet Campagne.
              </p>
            )}
          </div>
          <div className="lab-poster-footer">
            MUSIQUE · ÉNERGIE · ÉMOTION <span>↗</span>
          </div>
        </div>
      </div>
      {overflow && (
        <p role="status" className="lab-overflow">
          Le contenu dépasse ce format. Tous les éléments restent visibles :
          réduisez l’échelle ou augmentez la densité.
        </p>
      )}
    </div>
  );
}
export function CreativeLab({
  campaign,
  assets,
  onChange,
  onReset,
  historyEpoch,
}: {
  campaign: Campaign;
  assets: Map<string, Uint8Array>;
  historyEpoch: number;
  onChange: (
    recipe: CreativeRecipe,
    supportId: string,
    imageAssetId?: string,
  ) => void;
  onReset: (supportId: string) => void;
}) {
  const [targetSupportId, setTargetSupportId] = useState("");
  const [recipe, setRecipe] = useState<CreativeRecipe>(() =>
    directionToRecipe(campaignDirection(campaign)),
  );
  const [imageAssetId, setImageAssetId] = useState(
    campaignDirection(campaign).imageAssetId ?? "",
  );
  const [imageUrl, setImageUrl] = useState("");
  const [saved, setSaved] = useState<CreativeRecipe[]>([]);
  const [variants, setVariants] = useState<CreativeRecipe[]>([]);
  const [past, setPast] = useState<CreativeRecipe[]>([]);
  const [format, setFormat] = useState("square");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [paletteLocked, setPaletteLocked] = useState(false);
  const gesture = useRef<CreativeRecipe | null>(null);

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(storageKey) ??
        localStorage.getItem(legacyStorageKey);
      if (raw) {
        const items: unknown = JSON.parse(raw);
        if (!Array.isArray(items) || items.length > 50)
          throw new Error("Collection invalide.");
        const migrated = items.map(parseRecipe);
        setSaved(migrated);
        localStorage.setItem(storageKey, JSON.stringify(migrated));
      }
    } catch {
      setError(
        "Les recettes locales sont indisponibles ou invalides. L’export reste disponible.",
      );
    }
  }, []);
  useEffect(() => {
    const support = campaign.supports.find(
      (item) => item.id === targetSupportId,
    );
    const direction = support
      ? resolveSupportDirection(campaign, support)
      : campaignDirection(campaign);
    setRecipe(directionToRecipe(direction));
    setImageAssetId(direction.imageAssetId ?? "");
  }, [campaign.id, campaign.revision, targetSupportId, historyEpoch]);
  const selectedImage = campaign.assets.find(
    (item) => item.id === imageAssetId,
  );
  const selectedImagePath = selectedImage?.path ?? "";
  const selectedImageMime = selectedImage?.mimeType ?? "";
  useEffect(() => {
    const bytes = selectedImagePath ? assets.get(selectedImagePath) : undefined;
    if (!selectedImagePath || !bytes) {
      setImageUrl("");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([bytes], { type: selectedImageMime }),
    );
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [assets, selectedImagePath, selectedImageMime]);
  const imageAssets = campaign.assets.filter((asset) =>
    asset.mimeType.startsWith("image/"),
  );
  const targetSupport = campaign.supports.find(
    (support) => support.id === targetSupportId,
  );
  const capabilities = targetSupport?.template.creativeCapabilities;
  const axisEnabled = (axis: "energy" | "colorExpression" | "density" | "scale") =>
    !targetSupport || !!capabilities?.axes.includes(axis);
  const dominantEnabled = (dominant: CreativeRecipe["dominant"]) =>
    !targetSupport || !!capabilities?.dominants.includes(dominant);
  const completePresetSupport =
    !targetSupport ||
    (!!capabilities &&
      ["energy", "colorExpression", "density", "scale"].every((axis) =>
        capabilities.axes.includes(axis as (typeof capabilities.axes)[number]),
      ) &&
      ["image", "text", "balanced"].every((dominant) =>
        capabilities.dominants.includes(
          dominant as (typeof capabilities.dominants)[number],
        ),
      ));
  function persist(next: CreativeRecipe, selectedImageId = imageAssetId) {
    if (targetSupport && !capabilities) {
      setError("Ce support hérité ne déclare aucun ajustement créatif.");
      return false;
    }
    if (capabilities) {
      const changedAxes = (["energy", "colorExpression", "density", "scale"] as const)
        .filter((axis) => next[axis] !== recipe[axis]);
      if (changedAxes.some((axis) => !capabilities.axes.includes(axis))) {
        setError("Cet axe n’est pas pris en charge par le template.");
        return false;
      }
      if (next.dominant !== recipe.dominant && !dominantEnabled(next.dominant)) {
        setError("Cette dominante n’est pas prise en charge par le template.");
        return false;
      }
    }
    if (next.dominant === "image" && !selectedImageId) {
      setError("La dominante Image requiert une ressource image.");
      return false;
    }
    setError("");
    onChange(next, targetSupportId, selectedImageId || undefined);
    return true;
  }
  function apply(next: CreativeRecipe, remember = true) {
    if (!persist(next)) return;
    if (remember) setPast((p) => [...p.slice(-29), recipe]);
    setRecipe(next);
  }
  function choose(next: CreativeRecipe) {
    apply(next);
  }
  function point(e: PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const next = {
      ...recipe,
      energy: Math.round(clamp(((e.clientX - box.left) / box.width) * 100)),
      density: Math.round(clamp(((box.bottom - e.clientY) / box.height) * 100)),
    };
    if (persist(next)) setRecipe(next);
  }
  function finish(cancel = false) {
    if (gesture.current) {
      const previous = gesture.current;
      if (cancel) {
        setRecipe(previous);
        persist(previous);
      } else setPast((p) => [...p.slice(-29), previous]);
      gesture.current = null;
    }
  }
  function saveRecipe() {
    try {
      const valid = parseRecipe(recipe);
      if (saved.length >= 50)
        throw new Error(
          "Limite de 50 recettes atteinte. Supprimez une recette avant d’en ajouter.",
        );
      const next = [...saved, valid];
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSaved(next);
      setError("");
      setNotice("Recette enregistrée dans ce navigateur.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Enregistrement impossible. Exportez la recette.",
      );
    }
  }
  function exportRecipe() {
    try {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(parseRecipe(recipe), null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "recette-creative.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(String(e));
    }
  }
  const design = resolveCreative(recipe);
  return (
    <MotionConfig reducedMotion="user">
      <main className="creative-lab">
        <div className="lab-heading">
          <div>
            <span className="eyebrow">DIRECTION CRÉATIVE / LABO 01</span>
            <h1>Trouvez votre vibration.</h1>
            <p>
              Explorez une ambiance. Mélangez les idées. Gardez votre recette.
            </p>
          </div>
          <button
            disabled={!past.length}
            onClick={() => {
              const previous = past.at(-1)!;
              if (persist(previous)) {
                setRecipe(previous);
                setPast((p) => p.slice(0, -1));
              }
            }}
          >
            ↶ Revenir
          </button>
        </div>
        <div className="lab-grid">
          <aside className="lab-controls">
            <label className="lab-target">
              Portée de la direction
              <select
                value={targetSupportId}
                onChange={(event) => setTargetSupportId(event.target.value)}
              >
                <option value="">Campagne · réglage commun</option>
                {campaign.supports.map((support) => (
                  <option key={support.id} value={support.id}>
                    {support.name} ·{" "}
                    {support.variants.map((v) => v.format.name).join(", ")}
                  </option>
                ))}
              </select>
            </label>
            {targetSupportId && (
              <button
                className="wide"
                onClick={() => {
                  onReset(targetSupportId);
                  const inherited = campaignDirection(campaign);
                  setRecipe(directionToRecipe(inherited));
                  setImageAssetId(inherited.imageAssetId ?? "");
                }}
              >
                Réinitialiser les ajustements du support
              </button>
            )}
            <h2>Un point de départ</h2>
            <div className="lab-presets">
              {recipes.map((r) => (
                <button
                  key={r.name}
                  aria-label={r.name}
                  disabled={!completePresetSupport}
                  onClick={() =>
                    choose(
                      paletteLocked ? { ...r, harmony: recipe.harmony } : r,
                    )
                  }
                >
                  <span
                    className="lab-recipe-dot"
                    style={{
                      background: harmonies[r.harmony].background,
                      boxShadow: `inset -7px -5px ${harmonies[r.harmony].accent}`,
                    }}
                  />
                  <span>{r.name}</span>
                  <span>↗</span>
                </button>
              ))}
            </div>
            <div className="lab-control-heading">
              <h2>Jouez avec l’ambiance</h2>
              <span>↗</span>
            </div>
            <div className="lab-pad-label">
              <span>COMPACT</span>
              <span>ÉNERGIQUE →</span>
            </div>
            <div
              className="lab-pad"
              role="group"
              aria-disabled={!axisEnabled("energy") || !axisEnabled("density")}
              style={{
                pointerEvents:
                  axisEnabled("energy") && axisEnabled("density")
                    ? undefined
                    : "none",
                opacity:
                  axisEnabled("energy") && axisEnabled("density") ? 1 : 0.55,
              }}
              aria-label="Terrain énergie et densité"
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                gesture.current = recipe;
                e.currentTarget.setPointerCapture(e.pointerId);
                point(e);
              }}
              onPointerMove={(e) => {
                if (gesture.current) point(e);
              }}
              onPointerUp={(e) => {
                if (gesture.current) point(e);
                finish();
              }}
              onPointerCancel={() => finish(true)}
              onLostPointerCapture={() => finish()}
            >
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M50 0V100M0 50H100" />
              </svg>
              <span className="lab-pad-caption">Déplacez le point</span>
              <motion.div
                className="lab-pad-point"
                animate={{
                  left: `${recipe.energy}%`,
                  top: `${100 - recipe.density}%`,
                }}
                transition={{ duration: 0.08 }}
              />
            </div>
            <div className="lab-pad-label">
              <span>← CALME</span>
              <span>AÉRÉ</span>
            </div>
            {(
              [
                ["energy", "Énergie"],
                ["colorExpression", "Expression colorée"],
                ["density", "Densité"],
                ["scale", "Échelle graphique"],
              ] as const
            ).map(([key, label]) => (
              <label className="lab-range" key={key}>
                <span>
                  {label}
                  <output>{recipe[key]} %</output>
                </span>
                <input
                  aria-label={label}
                  type="range"
                  disabled={!axisEnabled(key)}
                  min="0"
                  max="100"
                  step="1"
                  value={recipe[key]}
                  onPointerDown={() => {
                    gesture.current = recipe;
                  }}
                  onPointerUp={() => finish()}
                  onPointerCancel={() => finish(true)}
                  onKeyDown={(e) => {
                    if (
                      e.key.startsWith("Arrow") ||
                      ["Home", "End", "PageUp", "PageDown"].includes(e.key)
                    )
                      setPast((p) => [...p.slice(-29), recipe]);
                  }}
                  onChange={(e) => {
                    const next = { ...recipe, [key]: Number(e.target.value) };
                    if (persist(next)) setRecipe(next);
                  }}
                />
              </label>
            ))}
            <div className="lab-control-heading">
              <h2>Dominante</h2>
            </div>
            <div className="lab-dominants" role="group" aria-label="Dominante">
              {(
                [
                  ["image", "Image"],
                  ["text", "Texte"],
                  ["balanced", "Équilibrée"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={recipe.dominant === value}
                  disabled={
                    (value === "image" && !imageAssets.length) ||
                    !dominantEnabled(value)
                  }
                  title={
                    value === "image" && !imageAssets.length
                      ? "Ajoutez d’abord une image à la campagne."
                      : undefined
                  }
                  onClick={() => {
                    const selected =
                      imageAssetId ||
                      (value === "image" ? (imageAssets[0]?.id ?? "") : "");
                    const next = { ...recipe, dominant: value };
                    if (persist(next, selected)) {
                      if (selected !== imageAssetId) setImageAssetId(selected);
                      setRecipe(next);
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {imageAssets.length > 0 && (
              <label>
                Ressource image
                <select
                  value={imageAssetId}
                  onChange={(event) => {
                    if (persist(recipe, event.target.value))
                      setImageAssetId(event.target.value);
                  }}
                >
                  <option value="">Aucune</option>
                  {imageAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.source}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="lab-control-heading">
              <h2>Une harmonie</h2>
              <button
                aria-pressed={paletteLocked}
                onClick={() => setPaletteLocked(!paletteLocked)}
              >
                {paletteLocked ? "Verrouillée" : "Verrouiller"}
              </button>
            </div>
            <div className="lab-swatches">
              {Object.entries(harmonies).map(([key, h]) => (
                <button
                  key={key}
                  aria-label={h.name}
                  aria-pressed={recipe.harmony === key}
                  disabled={paletteLocked}
                  onClick={() =>
                    choose({
                      ...recipe,
                      harmony: key as CreativeRecipe["harmony"],
                    })
                  }
                  style={{ background: h.background }}
                >
                  <i style={{ background: h.ink }} />
                  <i style={{ background: h.accent }} />
                </button>
              ))}
            </div>
            <p className="lab-harmony-name">
              {design.name} · palettes d’exploration
            </p>
            <button
              className="lab-surprise"
              disabled={!completePresetSupport}
              onClick={() => {
                const n = crypto.getRandomValues(new Uint32Array(4));
                choose({
                  ...recipe,
                  energy: n[0] % 101,
                  colorExpression: n[3] % 101,
                  density: n[1] % 101,
                  scale: n[2] % 101,
                  harmony: paletteLocked
                    ? recipe.harmony
                    : recipes[n[3] % 3].harmony,
                });
              }}
            >
              ✧ Surprends-moi
            </button>
          </aside>
          <section className="lab-stage" aria-label="Aperçu créatif">
            <div className="lab-stage-toolbar">
              <span>VOTRE CAMPAGNE, UNE AUTRE EXPRESSION</span>
              <div className="lab-formats">
                {[
                  ["square", "Carré"],
                  ["story", "Story"],
                  ["poster", "Affiche"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={format === id}
                    onClick={() => setFormat(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="lab-artboard">
              <CreativePoster
                recipe={recipe}
                campaign={campaign}
                format={format}
                imageUrl={imageUrl || undefined}
              />
            </div>
            <p className="lab-caption">
              Étude de direction créative · Tous les événements sont conservés ·
              Aperçu sans export graphique
            </p>
          </section>
          <aside className="lab-notebook">
            <span className="eyebrow">VOTRE CARNET</span>
            <h2>La bonne alchimie.</h2>
            <p>Gardez une direction et retrouvez-la pour une autre campagne.</p>
            <label>
              Nom de la recette
              <input
                maxLength={80}
                value={recipe.name}
                onChange={(e) =>
                  setRecipe((r) => ({ ...r, name: e.target.value }))
                }
              />
            </label>
            <button className="primary wide" onClick={saveRecipe}>
              + Garder cette recette
            </button>
            <div className="lab-file-actions">
              <button onClick={exportRecipe}>Exporter JSON</button>
              <label className="lab-import">
                Importer
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    try {
                      if (file.size > 8192)
                        throw new Error("Fichier trop volumineux.");
                      choose(parseRecipe(JSON.parse(await file.text())));
                      setError("");
                      setNotice(
                        "Recette importée. Enregistrez-la pour la conserver.",
                      );
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Import impossible.",
                      );
                    }
                  }}
                />
              </label>
            </div>
            <p className="hint">
              La direction courante est incluse dans la campagne. Les recettes
              restent des préréglages indépendants à exporter pour les
              transférer.
            </p>
            {notice && (
              <p role="status" className="lab-notice">
                {notice}
              </p>
            )}
            {error && (
              <p role="alert" className="lab-overflow">
                {error}
              </p>
            )}
            <h3>
              Mes recettes <span className="count">{saved.length}</span>
            </h3>
            {!saved.length && (
              <p className="hint">Votre première découverte commence ici.</p>
            )}
            {saved.map((r, i) => (
              <div className="lab-saved" key={i}>
                <button onClick={() => choose(r)}>{r.name}</button>
                <button
                  aria-label={`Supprimer la recette ${r.name}`}
                  onClick={() => {
                    try {
                      const next = saved.filter((_, j) => i !== j);
                      localStorage.setItem(storageKey, JSON.stringify(next));
                      setSaved(next);
                    } catch {
                      setError("Suppression impossible dans ce navigateur.");
                    }
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <div className="lab-explore">
              <h3>Et si on essayait…</h3>
              <p>Quatre nuances autour de votre mélange actuel.</p>
              <button
                className="wide"
                onClick={() => setVariants(explore(recipe))}
              >
                Explorer autour ↗
              </button>
              <div className="lab-variants">
                {variants.map((r, i) => (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={i}
                    onClick={() => choose(r)}
                  >
                    <span>{r.name}</span>
                    <small>
                      Énergie {r.energy} · Densité {r.density}
                    </small>
                  </motion.button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </MotionConfig>
  );
}
