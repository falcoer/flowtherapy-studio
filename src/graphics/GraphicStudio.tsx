import { useEffect, useRef, useState, type ReactNode } from "react";
import { defaultPalette, defaultSurfaces, newProject } from "./defaults.js";
import {
  changeSurface,
  clamp,
  FONTS,
  instantiate,
  MAX_JSON_BYTES,
  parseCatalog,
  parseProject,
  removeAnchor,
  uid,
  validateScene,
  type Anchor,
  type Catalog,
  type Preset,
  type Project,
  type Renderer,
  type Surface,
} from "./model.js";
import { Stage, type Selection } from "./Stage.js";
import {
  download,
  exportDimensions,
  exportGraphic,
  jsonDownload,
  MAX_SEQUENCE_PIXELS,
  videoMime,
} from "./exports.js";
import { loadWorkspace, saveWorkspace } from "./storage.js";
import { IndexedDBCampaignStore } from "../storage/indexeddb.js";
import type { Asset as StudioAsset } from "../domain/model.js";
import { sha256 } from "../storage/archive.js";
import "./graphics.css";

function NumberField({
  label,
  value,
  onChange,
  min = -12000,
  max = 12000,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          if (Number.isFinite(e.target.valueAsNumber))
            onChange(clamp(e.target.valueAsNumber, min, max));
        }}
      />
    </label>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="gx-dialog"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button onClick={onClose} aria-label="Fermer la boîte">
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
async function readJSON(file: File) {
  if (file.size > MAX_JSON_BYTES)
    throw new Error("Fichier trop volumineux (32 Mio maximum).");
  return file.text();
}
function CatalogDialog<T extends Surface | Preset>({
  title,
  catalog,
  apply,
  close,
}: {
  title: string;
  catalog: Catalog<T>;
  apply: (c: Catalog<T>) => void;
  close: () => void;
}) {
  const [text, setText] = useState(JSON.stringify(catalog, null, 2)),
    [error, setError] = useState("");
  function validate() {
    try {
      const c = parseCatalog<T>(text, catalog.kind);
      apply(c);
      close();
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <Modal title={title} onClose={close}>
      <p>
        Ajoutez, renommez ou dupliquez les entrées JSON. Les compositions
        existantes conservent leurs réglages.
      </p>
      <div className="gx-actions">
        <label className="gx-file">
          Importer JSON
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f)
                void readJSON(f)
                  .then((t) => {
                    parseCatalog(t, catalog.kind);
                    setText(t);
                    setError("");
                  })
                  .catch((e) => setError(String(e)));
            }}
          />
        </label>
        <button
          onClick={() => {
            try {
              jsonDownload(
                parseCatalog(text, catalog.kind),
                `${catalog.kind}.json`,
              );
              setError("");
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          Exporter JSON
        </button>
      </div>
      <label>
        Définition du catalogue
        <textarea
          className="gx-code"
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="gx-error">
          {error}
        </p>
      )}
      <div className="gx-dialog-footer">
        <span>Version 1 · validation avant import</span>
        <button className="gx-primary" onClick={validate}>
          Appliquer le catalogue
        </button>
      </div>
    </Modal>
  );
}
export function GraphicStudio() {
  const [project, setProject] = useState<Project>(newProject),
    [palette, setPalette] = useState(defaultPalette),
    [surfaces, setSurfaces] = useState(defaultSurfaces);
  const [selection, select] = useState<Selection>({
      type: "renderer",
      id: project.renderers[2].id,
    }),
    [mode, setMode] = useState<"select" | "anchor">("select");
  const [magnet, setMagnet] = useState(true),
    [guides, setGuides] = useState(true),
    [playing, setPlaying] = useState(false),
    [time, setTime] = useState(0);
  const [zoom, setZoom] = useState(1),
    [loaded, setLoaded] = useState(false),
    [saved, setSaved] = useState("Chargement…");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [dialog, setDialog] = useState<
      "palette" | "surfaces" | "export" | "library" | null
    >(null);
  const [past, setPast] = useState<Project[]>([]),
    [future, setFuture] = useState<Project[]>([]);
  const [library, setLibrary] = useState<StudioAsset[]>([]),
    [rights, setRights] = useState(""),
    [libraryBusy, setLibraryBusy] = useState(false);
  const [exportKind, setExportKind] = useState<"png" | "sequence" | "video">(
      "png",
    ),
    [exportScale, setExportScale] = useState(1),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0);
  const abort = useRef<AbortController | null>(null),
    state = useRef(project);
  state.current = project;
  const exportLock = useRef(false),
    saveChain = useRef(Promise.resolve()),
    saveGeneration = useRef(0),
    loadFailed = useRef(false);
  const workspace = useRef({ project, palette, surfaces }),
    loadedRef = useRef(loaded);
  workspace.current = { project, palette, surfaces };
  loadedRef.current = loaded;
  useEffect(() => {
    let active = true;
    void loadWorkspace()
      .then((data) => {
        if (active && data) {
          setProject(data.project);
          select(
            data.project.renderers[0]
              ? { type: "renderer", id: data.project.renderers[0].id }
              : null,
          );
          setPalette(data.palette);
          setSurfaces(data.surfaces);
        }
      })
      .catch((e) => {
        loadFailed.current = true;
        if (active) setError(`Sauvegarde locale illisible : ${String(e)}`);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
      abort.current?.abort();
      // Hash navigation does not fire beforeunload. Flush a pending edit on exit.
      if (loadedRef.current && !loadFailed.current) {
        const finalWorkspace = workspace.current;
        saveChain.current = saveChain.current
          .catch(() => {})
          .then(() => saveWorkspace(finalWorkspace));
        void saveChain.current.catch(() => {});
      }
    };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    // Never replace an unreadable/future-version workspace with the demo.
    if (loadFailed.current) {
      setSaved("Non enregistré");
      return;
    }
    setSaved("Enregistrement…");
    const generation = ++saveGeneration.current;
    const timer = setTimeout(() => {
      saveChain.current = saveChain.current
        .catch(() => {})
        .then(() => saveWorkspace({ project, palette, surfaces }));
      void saveChain.current
        .then(() => {
          if (generation === saveGeneration.current)
            setSaved("Enregistré localement");
        })
        .catch((e) => {
          if (generation === saveGeneration.current) {
            setSaved("Non enregistré");
            setError(
              `Stockage indisponible : ${String(e)}. Exportez le document JSON.`,
            );
          }
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [project, palette, surfaces, loaded]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (saved !== "Enregistré localement") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [saved]);
  function change(p: Project, history = true) {
    try {
      validateScene(p);
    } catch (e) {
      setError(String(e));
      return;
    }
    if (history) {
      setPast((xs) => [...xs.slice(-29), state.current]);
      setFuture([]);
    }
    setProject(p);
    setError("");
  }
  function undo() {
    const prev = past.at(-1);
    if (prev) {
      setFuture((xs) => [state.current, ...xs]);
      setPast((xs) => xs.slice(0, -1));
      setProject(prev);
      setError("");
    }
  }
  function redo() {
    const next = future[0];
    if (next) {
      setPast((xs) => [...xs, state.current]);
      setFuture((xs) => xs.slice(1));
      setProject(next);
      setError("");
    }
  }
  const renderer =
    selection?.type === "renderer"
      ? project.renderers.find((r) => r.id === selection.id)
      : undefined;
  const anchor = project.anchors.find(
    (a) =>
      a.id ===
      (renderer?.anchorId ??
        (selection?.type === "anchor" ? selection.id : "")),
  );
  const patchRenderer = (patch: Partial<Renderer>) => {
    if (renderer)
      change({
        ...project,
        renderers: project.renderers.map((r) =>
          r.id === renderer.id ? { ...r, ...patch } : r,
        ),
      });
  };
  const patchAnchor = (patch: Partial<Anchor>) => {
    if (anchor)
      change({
        ...project,
        anchors: project.anchors.map((a) =>
          a.id === anchor.id ? { ...a, ...patch } : a,
        ),
      });
  };
  function addAnchor(x = 0.5, y = 0.5) {
    if (project.anchors.length >= 100) {
      setError("Maximum 100 ancrages.");
      return;
    }
    const a = {
      id: uid(),
      name: `Ancrage ${project.anchors.length + 1}`,
      x,
      y,
    };
    change({ ...project, anchors: [...project.anchors, a] });
    select({ type: "anchor", id: a.id });
  }
  function drop(presetId: string, rendererId: string, x: number, y: number) {
    if (!presetId && !rendererId) return;
    const a = project.anchors
      .map((a) => ({
        a,
        d: Math.hypot(
          (a.x - x) * project.surface.width,
          (a.y - y) * project.surface.height,
        ),
      }))
      .sort((a, b) => a.d - b.d)[0];
    let next = project,
      target = a && a.d < project.surface.width * 0.045 ? a.a : undefined;
    if (!target) {
      if (project.anchors.length >= 100) {
        setError("Maximum 100 ancrages.");
        return;
      }
      target = {
        id: uid(),
        name: `Ancrage ${project.anchors.length + 1}`,
        x,
        y,
      };
      next = { ...next, anchors: [...next.anchors, target] };
    }
    if (rendererId) {
      change({
        ...next,
        renderers: next.renderers.map((r) =>
          r.id === rendererId
            ? { ...r, anchorId: target!.id, offsetX: 0, offsetY: 0 }
            : r,
        ),
      });
      select({ type: "renderer", id: rendererId });
      return;
    }
    const preset = palette.items.find((p) => p.id === presetId);
    if (!preset) return;
    if (next.renderers.length >= 100) {
      setError("Maximum 100 renderers.");
      return;
    }
    const r = instantiate(preset, target.id, next);
    change({ ...next, renderers: [...next.renderers, r] });
    select({ type: "renderer", id: r.id });
    setMode("select");
  }
  function addPreset(preset: Preset) {
    drop(preset.id, "", anchor?.x ?? 0.5, anchor?.y ?? 0.5);
  }
  function removeSelection() {
    if (renderer) {
      change({
        ...project,
        renderers: project.renderers.filter((r) => r.id !== renderer.id),
      });
      select(anchor ? { type: "anchor", id: anchor.id } : null);
    } else if (anchor) {
      change(removeAnchor(project, anchor.id));
      select(null);
    }
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        dialog ||
        (e.target as HTMLElement).closest(
          "input,textarea,select,[contenteditable]",
        )
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeSelection();
      } else if (e.key === "Escape") {
        setMode("select");
        select(null);
      } else if (e.key.toLowerCase() === "a") {
        setMode("anchor");
        setGuides(true);
      } else if (e.key.toLowerCase() === "v") setMode("select");
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  async function openLibrary() {
    setDialog("library");
    setLibraryBusy(true);
    const store = new IndexedDBCampaignStore();
    try {
      setLibrary(
        (await store.listResources()).filter((a) =>
          ["image/png", "image/jpeg", "image/webp"].includes(a.mimeType),
        ),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setLibraryBusy(false);
      await store.close();
    }
  }
  async function attachLibrary(hash: string) {
    setLibraryBusy(true);
    const store = new IndexedDBCampaignStore();
    try {
      const { asset, bytes } = await store.loadResource(hash);
      const dataUrl = await dataURL(
        new Blob([new Uint8Array(bytes)], { type: asset.mimeType }),
      );
      addAsset({
        id: asset.sha256,
        name: asset.source,
        dataUrl,
        rights: asset.rights,
      });
      setDialog(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLibraryBusy(false);
      await store.close();
    }
  }
  function addAsset(asset: Project["assets"][number]) {
    const p = state.current;
    if (!p.assets.some((a) => a.id === asset.id) && p.assets.length >= 50)
      throw new Error("Maximum 50 images.");
    const next = {
      ...p,
      assets: p.assets.some((a) => a.id === asset.id)
        ? p.assets
        : [...p.assets, asset],
      renderers: p.renderers.map((r) =>
        r.id === renderer?.id && r.kind === "image"
          ? { ...r, assetId: asset.id }
          : r,
      ),
    };
    parseProject(JSON.stringify(next));
    change(next);
    setNotice("Image disponible dans la bibliothèque du document.");
  }
  async function importImage(file: File) {
    setLibraryBusy(true);
    try {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 12 * 1024 * 1024
      )
        throw new Error("PNG, JPEG ou WebP de 12 Mio maximum.");
      const bitmap = await createImageBitmap(file);
      const pixels = bitmap.width * bitmap.height;
      bitmap.close();
      if (pixels > 40_000_000)
        throw new Error("Image de 40 mégapixels maximum.");
      const bytes = new Uint8Array(await file.arrayBuffer()),
        hash = await sha256(bytes);
      addAsset({
        id: hash,
        name: file.name,
        dataUrl: await dataURL(file),
        rights,
      });
      const store = new IndexedDBCampaignStore();
      try {
        await store.importResource(
          {
            id: hash,
            path: `assets/${hash}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`,
            mimeType: file.type,
            sha256: hash,
            source: file.name,
            rights,
          },
          bytes,
        );
      } catch (e) {
        setNotice(
          `Image conservée dans le document ; bibliothèque partagée : ${String(e)}`,
        );
      } finally {
        await store.close();
      }
      setRights("");
    } catch (e) {
      setError(String(e));
    } finally {
      setLibraryBusy(false);
    }
  }
  async function exportNow() {
    if (exportLock.current) return;
    exportLock.current = true;
    setBusy(true);
    setProgress(0);
    setError("");
    setPlaying(false);
    abort.current = new AbortController();
    try {
      const result = await exportGraphic(
        project,
        exportKind,
        exportScale,
        time,
        setProgress,
        abort.current.signal,
      );
      download(result.blob, result.name);
      setNotice(`Export prêt : ${result.name}`);
    } catch (e) {
      setError(String(e));
    } finally {
      exportLock.current = false;
      setBusy(false);
      abort.current = null;
    }
  }
  const dimensions = exportDimensions(project, exportScale),
    frames = Math.round(project.duration * project.fps);
  const sequenceTooLarge =
    dimensions.width * dimensions.height * frames > MAX_SEQUENCE_PIXELS;
  if (!loaded)
    return (
      <main className="graphic-studio">
        <p>Ouverture de l’atelier graphique…</p>
      </main>
    );
  return (
    <main className="graphic-studio">
      <header className="gx-topbar">
        <a
          className="gx-logo"
          href="#laboratoire"
          aria-label="Retour au studio"
        >
          ft<span>STUDIO</span>
        </a>
        <span className="gx-top-separator" />
        <div>
          <span className="gx-eyebrow">
            ATELIER GRAPHIQUE <b>PROTOTYPE</b>
          </span>
          <input
            className="gx-project-name"
            aria-label="Nom du document"
            value={project.name}
            maxLength={200}
            onChange={(e) =>
              change({ ...project, name: e.target.value || "Sans titre" })
            }
          />
        </div>
        <span className="gx-save">
          <i /> {saved}
        </span>
        <div className="gx-top-actions">
          <button onClick={() => jsonDownload(project, "composition.json")}>
            Sauvegarder JSON
          </button>
          <label className="gx-file">
            Ouvrir
            <input
              aria-label="Importer une composition"
              type="file"
              accept=".json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f)
                  void readJSON(f)
                    .then((t) => {
                      change(parseProject(t));
                      select(null);
                      setTime(0);
                      setPlaying(false);
                      setNotice(
                        "Composition importée. Annuler pour retrouver la précédente.",
                      );
                    })
                    .catch((e) => setError(String(e)));
              }}
            />
          </label>
          <button className="gx-primary" onClick={() => setDialog("export")}>
            Exporter <span>↗</span>
          </button>
        </div>
      </header>
      <div className="gx-toolbar">
        <div className="gx-actions">
          <button aria-label="Annuler" disabled={!past.length} onClick={undo}>
            ↶
          </button>
          <button
            aria-label="Rétablir"
            disabled={!future.length}
            onClick={redo}
          >
            ↷
          </button>
          <span className="gx-separator" />
          <button
            aria-pressed={mode === "select"}
            onClick={() => setMode("select")}
          >
            ↖ Sélection <kbd>V</kbd>
          </button>
          <button
            aria-pressed={mode === "anchor"}
            onClick={() => {
              setMode("anchor");
              setGuides(true);
            }}
          >
            ⊕ Ancrage <kbd>A</kbd>
          </button>
        </div>
        <div className="gx-actions">
          <button aria-pressed={magnet} onClick={() => setMagnet(!magnet)}>
            ⌁ Magnétisme
          </button>
          <button aria-pressed={guides} onClick={() => setGuides(!guides)}>
            Repères
          </button>
          <select
            aria-label="Zoom"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          >
            <option value={0.75}>75 %</option>
            <option value={1}>Ajuster</option>
            <option value={1.25}>125 %</option>
            <option value={1.5}>150 %</option>
          </select>
        </div>
      </div>
      {(error || notice) && (
        <div
          className={`gx-notice ${error ? "gx-error" : ""}`}
          role={error ? "alert" : "status"}
        >
          <span>{error || notice}</span>
          <button
            aria-label="Masquer le message"
            onClick={() => {
              setError("");
              setNotice("");
            }}
          >
            ×
          </button>
        </div>
      )}
      <div className="gx-workspace">
        <aside className="gx-left">
          <section>
            <div className="gx-section-heading">
              <div>
                <span className="gx-eyebrow">MATIÈRES & EFFETS</span>
                <h2>Palette</h2>
              </div>
              <button
                onClick={() => setDialog("palette")}
                aria-label="Configurer la palette"
              >
                ⚙
              </button>
            </div>
            <p className="gx-hint">
              Glissez un élément sur un ancrage.
              <br />
              Ou cliquez pour l’ajouter.
            </p>
            <div className="gx-palette">
              {palette.items.map((p) => (
                <button
                  key={p.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("ft-preset", p.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => addPreset(p)}
                  className="gx-preset"
                  aria-label={`Ajouter ${p.name}`}
                >
                  <span
                    className={`gx-swatch gx-swatch-${p.style.kind === "shader" ? p.style.shader : p.style.kind}`}
                    style={
                      { "--swatch-color": p.style.color } as React.CSSProperties
                    }
                  >
                    {p.style.kind === "text"
                      ? "Aa"
                      : p.style.kind === "image"
                        ? "▧"
                        : ""}
                  </span>
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.description}</small>
                  </span>
                  <span className="gx-plus">+</span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <div className="gx-section-heading">
              <div>
                <span className="gx-eyebrow">STRUCTURE</span>
                <h2>
                  Ancrages <small>{project.anchors.length}</small>
                </h2>
              </div>
              <button
                aria-label="Ajouter un ancrage au centre"
                onClick={() => {
                  addAnchor();
                  setGuides(true);
                }}
              >
                +
              </button>
            </div>
            <div className="gx-tree">
              {project.anchors.map((a, i) => (
                <div key={a.id}>
                  <button
                    className={`gx-tree-anchor ${anchor?.id === a.id ? "is-selected" : ""}`}
                    onClick={() => select({ type: "anchor", id: a.id })}
                  >
                    <span>⊕</span>
                    <span>{a.name}</span>
                    <small>{String(i + 1).padStart(2, "0")}</small>
                  </button>
                  {project.renderers
                    .filter((r) => r.anchorId === a.id)
                    .sort((a, b) => b.z - a.z)
                    .map((r) => (
                      <button
                        key={r.id}
                        draggable
                        onDragStart={(e) =>
                          e.dataTransfer.setData("ft-renderer", r.id)
                        }
                        className={`gx-layer ${renderer?.id === r.id ? "is-selected" : ""}`}
                        onClick={() => select({ type: "renderer", id: r.id })}
                      >
                        <span>
                          {r.kind === "text"
                            ? "T"
                            : r.kind === "image"
                              ? "▧"
                              : "✧"}
                        </span>
                        <span>{r.name}</span>
                        <small>{r.z}</small>
                      </button>
                    ))}
                </div>
              ))}
            </div>
            <p className="gx-hint">
              Glissez un calque vers un autre point pour le rattacher.
            </p>
          </section>
        </aside>
        <section className="gx-center">
          <div className="gx-canvas-title">
            <span>{project.surface.name}</span>
            <small>
              {project.surface.width} × {project.surface.height} px
            </small>
          </div>
          <div className="gx-canvas-scroll">
            <div
              className="gx-canvas-frame"
              style={{
                width: `${Math.min(680, (460 * project.surface.width) / project.surface.height) * zoom}px`,
              }}
            >
              <Stage
                project={project}
                selection={selection}
                select={select}
                mode={mode}
                magnet={magnet}
                guidesVisible={guides}
                playing={playing}
                time={time}
                change={change}
                finishDrag={(before) => {
                  setPast((xs) => [...xs.slice(-29), before]);
                  setFuture([]);
                }}
                addAnchor={addAnchor}
                drop={drop}
                onError={setError}
                onTime={setTime}
              />
            </div>
          </div>
          <p className="gx-canvas-help">
            {mode === "anchor"
              ? "Cliquez pour placer un point · alignements et milieux aimantés"
              : "Déplacez un ancrage pour déplacer ses éléments · double réglage : point + décalage local"}
          </p>
          <div className="gx-timeline">
            <button
              aria-label={playing ? "Mettre en pause" : "Lire l’animation"}
              onClick={() => setPlaying(!playing)}
            >
              {playing ? "Ⅱ" : "▶"}
            </button>
            <span>{time.toFixed(1)} s</span>
            <input
              aria-label="Position de lecture"
              type="range"
              min={0}
              max={project.duration}
              step={0.01}
              value={time}
              onChange={(e) => {
                setPlaying(false);
                setTime(e.target.valueAsNumber);
              }}
            />
            <span>{project.duration} s</span>
            <span className="gx-live">● WEBGL</span>
          </div>
        </section>
        <aside className="gx-right">
          <section>
            <div className="gx-section-heading">
              <div>
                <span className="gx-eyebrow">SUPPORT</span>
                <h2>Surface</h2>
              </div>
              <button
                aria-label="Configurer les formats"
                onClick={() => setDialog("surfaces")}
              >
                ⚙
              </button>
            </div>
            <label>
              Format
              <select
                aria-label="Format"
                value={
                  surfaces.items.some((s) => s.id === project.surface.id)
                    ? project.surface.id
                    : ""
                }
                onChange={(e) => {
                  const surface = surfaces.items.find(
                    (s) => s.id === e.target.value,
                  );
                  if (surface) change(changeSurface(project, surface));
                }}
              >
                {!surfaces.items.some((s) => s.id === project.surface.id) && (
                  <option value="">{project.surface.name} (instantané)</option>
                )}
                {surfaces.items.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="gx-surface-meta">
              <span>
                {project.surface.width} × {project.surface.height} px
              </span>
              <span>{project.surface.dpi} dpi</span>
            </div>
            <label className="gx-color-label">
              Fond
              <input
                aria-label="Couleur du fond"
                type="color"
                value={project.background}
                onChange={(e) =>
                  change({ ...project, background: e.target.value })
                }
              />
            </label>
          </section>
          <section>
            <span className="gx-eyebrow">
              {renderer
                ? "RENDERER"
                : anchor
                  ? "POINT D’ANCRAGE"
                  : "INSPECTEUR"}
            </span>
            <h2>{renderer?.name ?? anchor?.name ?? "Votre composition"}</h2>
            {!anchor && (
              <p className="gx-hint">
                Sélectionnez un point ou un élément sur la surface pour modifier
                ses propriétés.
              </p>
            )}
            {renderer && (
              <>
                <label>
                  Nom du renderer
                  <input
                    value={renderer.name}
                    maxLength={200}
                    onChange={(e) =>
                      patchRenderer({ name: e.target.value || "Renderer" })
                    }
                  />
                </label>
                <label>
                  Attaché à
                  <select
                    value={renderer.anchorId}
                    onChange={(e) =>
                      patchRenderer({ anchorId: e.target.value })
                    }
                  >
                    {project.anchors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                {renderer.kind === "text" && (
                  <>
                    <label>
                      Contenu
                      <textarea
                        aria-label="Contenu du texte"
                        rows={3}
                        value={renderer.text}
                        maxLength={10000}
                        onChange={(e) =>
                          patchRenderer({ text: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Police
                      <select
                        value={renderer.font}
                        onChange={(e) =>
                          patchRenderer({ font: e.target.value })
                        }
                      >
                        {FONTS.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                    <NumberField
                      label="Taille de police"
                      min={1}
                      max={3000}
                      value={renderer.fontSize}
                      onChange={(fontSize) => patchRenderer({ fontSize })}
                    />
                    <p className="gx-hint">
                      Le texte est réduit si nécessaire pour rester entier dans
                      son cadre. Retours à la ligne explicites.
                    </p>
                  </>
                )}
                {renderer.kind === "image" && (
                  <>
                    <label>
                      Image de la bibliothèque
                      <select
                        value={renderer.assetId}
                        onChange={(e) =>
                          patchRenderer({ assetId: e.target.value })
                        }
                      >
                        {project.assets.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="gx-wide"
                      onClick={() => void openLibrary()}
                    >
                      Parcourir / importer une image
                    </button>
                    <p className="gx-hint">
                      Image entière, proportions conservées.
                    </p>
                  </>
                )}
                {renderer.kind === "shader" && (
                  <>
                    <label>
                      Effet
                      <select
                        value={renderer.shader}
                        onChange={(e) =>
                          patchRenderer({
                            shader: e.target.value as Renderer["shader"],
                          })
                        }
                      >
                        <option value="aurora">Aurore</option>
                        <option value="halo">Halo</option>
                        <option value="waves">Ondes</option>
                      </select>
                    </label>
                    <div className="gx-fields">
                      <NumberField
                        label="Vitesse"
                        value={renderer.speed}
                        min={0}
                        max={5}
                        step={0.1}
                        onChange={(speed) => patchRenderer({ speed })}
                      />
                      <NumberField
                        label="Intensité"
                        value={renderer.intensity}
                        min={0}
                        max={3}
                        step={0.1}
                        onChange={(intensity) => patchRenderer({ intensity })}
                      />
                    </div>
                  </>
                )}
                <h3>Transformation</h3>
                <div className="gx-fields">
                  <NumberField
                    label="Décalage X"
                    value={renderer.offsetX}
                    onChange={(offsetX) => patchRenderer({ offsetX })}
                  />
                  <NumberField
                    label="Décalage Y"
                    value={renderer.offsetY}
                    onChange={(offsetY) => patchRenderer({ offsetY })}
                  />
                  <NumberField
                    label="Largeur"
                    value={renderer.width}
                    min={1}
                    onChange={(width) => patchRenderer({ width })}
                  />
                  <NumberField
                    label="Hauteur"
                    value={renderer.height}
                    min={1}
                    onChange={(height) => patchRenderer({ height })}
                  />
                  <NumberField
                    label="Rotation °"
                    value={renderer.rotation}
                    min={-360}
                    max={360}
                    onChange={(rotation) => patchRenderer({ rotation })}
                  />
                  <NumberField
                    label="Ordre Z"
                    value={renderer.z}
                    min={-1000}
                    max={1000}
                    onChange={(z) => patchRenderer({ z })}
                  />
                </div>
                <label>
                  Opacité <span>{Math.round(renderer.opacity * 100)} %</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={renderer.opacity}
                    onChange={(e) =>
                      patchRenderer({ opacity: e.target.valueAsNumber })
                    }
                  />
                </label>
                <h3>Colorimétrie</h3>
                <label className="gx-color-label">
                  {renderer.kind === "image" ? "Filtre couleur" : "Couleur"}
                  <input
                    aria-label="Couleur du renderer"
                    type="color"
                    value={renderer.color}
                    onChange={(e) => patchRenderer({ color: e.target.value })}
                  />
                </label>
                <div className="gx-fields">
                  <NumberField
                    label="Teinte °"
                    value={renderer.hue}
                    min={-180}
                    max={180}
                    onChange={(hue) => patchRenderer({ hue })}
                  />
                  <NumberField
                    label="Saturation"
                    value={renderer.saturation}
                    min={0}
                    max={3}
                    step={0.1}
                    onChange={(saturation) => patchRenderer({ saturation })}
                  />
                  <NumberField
                    label="Luminosité"
                    value={renderer.brightness}
                    min={0}
                    max={3}
                    step={0.1}
                    onChange={(brightness) => patchRenderer({ brightness })}
                  />
                </div>
                <button className="gx-danger gx-wide" onClick={removeSelection}>
                  Supprimer le renderer
                </button>
              </>
            )}
            {anchor && !renderer && (
              <>
                <label>
                  Nom de l’ancrage
                  <input
                    value={anchor.name}
                    maxLength={200}
                    onChange={(e) =>
                      patchAnchor({ name: e.target.value || "Ancrage" })
                    }
                  />
                </label>
                <div className="gx-fields">
                  <NumberField
                    label="Position X %"
                    value={anchor.x * 100}
                    min={0}
                    max={100}
                    step={0.1}
                    onChange={(x) => patchAnchor({ x: x / 100 })}
                  />
                  <NumberField
                    label="Position Y %"
                    value={anchor.y * 100}
                    min={0}
                    max={100}
                    step={0.1}
                    onChange={(y) => patchAnchor({ y: y / 100 })}
                  />
                </div>
                <p className="gx-hint">
                  {
                    project.renderers.filter((r) => r.anchorId === anchor.id)
                      .length
                  }{" "}
                  élément(s) attaché(s). Les décalages restent propres à chaque
                  renderer.
                </p>
                <button className="gx-danger gx-wide" onClick={removeSelection}>
                  Supprimer l’ancrage et ses éléments
                </button>
                <p className="gx-hint">Cette suppression peut être annulée.</p>
              </>
            )}
          </section>
          <button
            className="gx-library-button"
            onClick={() => void openLibrary()}
          >
            ▧ Bibliothèque d’images <span>{project.assets.length}</span>
          </button>
        </aside>
      </div>
      <footer className="gx-statusbar">
        <span>
          {project.anchors.length} ancrages · {project.renderers.length}{" "}
          renderers
        </span>
        <span>Local · RGB · {project.fps} images/s</span>
        <span>⌘ / Ctrl Z pour annuler</span>
      </footer>
      {dialog === "palette" && (
        <CatalogDialog
          title="Palette de renderers"
          catalog={palette}
          apply={setPalette}
          close={() => setDialog(null)}
        />
      )}
      {dialog === "surfaces" && (
        <CatalogDialog
          title="Formats de surface"
          catalog={surfaces}
          apply={setSurfaces}
          close={() => setDialog(null)}
        />
      )}
      {dialog === "library" && (
        <Modal title="Bibliothèque d’images" onClose={() => setDialog(null)}>
          <h3>Dans ce document</h3>
          <div className="gx-images">
            {project.assets.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  if (renderer?.kind === "image")
                    patchRenderer({ assetId: a.id });
                  else {
                    const preset = palette.items.find(
                      (p) => p.style.kind === "image",
                    );
                    if (preset) {
                      let next = project,
                        target = anchor;
                      if (!target) {
                        target = { id: uid(), name: "Image", x: 0.5, y: 0.5 };
                        next = { ...next, anchors: [...next.anchors, target] };
                      }
                      const r = instantiate(preset, target.id, next);
                      r.assetId = a.id;
                      change({ ...next, renderers: [...next.renderers, r] });
                      select({ type: "renderer", id: r.id });
                    } else {
                      setError("Ajoutez un preset Image à la palette.");
                      return;
                    }
                  }
                  setDialog(null);
                }}
              >
                <img src={a.dataUrl} alt="" />
                <span>{a.name}</span>
              </button>
            ))}
          </div>
          <h3>Ressources partagées du studio</h3>
          {libraryBusy ? (
            <p>Chargement…</p>
          ) : library.length ? (
            <div className="gx-library-list">
              {library.map((a) => (
                <button
                  key={a.sha256}
                  onClick={() => void attachLibrary(a.sha256)}
                >
                  {a.source} <small>{a.rights}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="gx-hint">Aucune image partagée pour le moment.</p>
          )}
          <label>
            Droits / provenance
            <input
              value={rights}
              onChange={(e) => setRights(e.target.value)}
              placeholder="Création personnelle, autorisation…"
            />
          </label>
          <label className="gx-file">
            Importer une image
            <input
              aria-label="Importer une image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={libraryBusy || !rights.trim()}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void importImage(f);
              }}
            />
          </label>
          {error && (
            <p role="alert" className="gx-error">
              {error}
            </p>
          )}
        </Modal>
      )}
      {dialog === "export" && (
        <Modal
          title="Exporter la composition"
          onClose={() => {
            if (!busy) setDialog(null);
          }}
        >
          <fieldset disabled={busy}>
            <label>
              Type d’export
              <select
                value={exportKind}
                onChange={(e) =>
                  setExportKind(e.target.value as typeof exportKind)
                }
              >
                <option value="png">Image PNG · instant courant</option>
                <option value="sequence">Séquence PNG · archive ZIP</option>
                <option value="video" disabled={!videoMime()}>
                  Vidéo · {videoMime()?.includes("mp4") ? "MP4" : "WebM"}
                  {!videoMime() ? " (indisponible)" : ""}
                </option>
              </select>
            </label>
            <label>
              Résolution
              <select
                value={exportScale}
                onChange={(e) => setExportScale(Number(e.target.value))}
              >
                <option value={1}>100 % · résolution du support</option>
                <option value={0.5}>50 %</option>
                <option value={0.25}>25 %</option>
              </select>
            </label>
            <div className="gx-fields">
              <NumberField
                label="Durée (secondes)"
                value={project.duration}
                min={1}
                max={10}
                step={1}
                onChange={(duration) => {
                  change({ ...project, duration });
                  setTime(Math.min(time, duration));
                }}
              />
              <NumberField
                label="Images par seconde"
                value={project.fps}
                min={1}
                max={30}
                onChange={(fps) => change({ ...project, fps: Math.round(fps) })}
              />
            </div>
          </fieldset>
          <div className="gx-export-summary">
            <strong>
              {dimensions.width} × {dimensions.height} px
            </strong>
            <span>
              {exportKind === "png"
                ? `À ${time.toFixed(2)} seconde`
                : `${frames} images · ${project.duration} secondes`}
            </span>
          </div>
          <p className="gx-hint">
            {exportKind === "video"
              ? "Capture en temps réel, sans audio. Gardez cet onglet visible. Pour une cadence exacte, utilisez la séquence PNG."
              : exportKind === "sequence"
                ? "Images calculées à temps fixe, depuis t = 0. Le ZIP inclut la cadence dans manifest.json."
                : "Le PNG utilise le même moteur que l’aperçu, sans les repères d’édition."}{" "}
            Supports papier : raster RGB, sans fond perdu ni profil CMJN ; le
            DPI est une indication de format.
          </p>
          {exportKind === "sequence" && sequenceTooLarge && (
            <p className="gx-error">
              Séquence trop volumineuse. Réduisez résolution, durée ou cadence.
            </p>
          )}
          {busy && <progress value={progress} max={1} />}{" "}
          {error && (
            <p className="gx-error" role="alert">
              {error}
            </p>
          )}
          <div className="gx-dialog-footer">
            <span>
              {busy
                ? `${Math.round(progress * 100)} %`
                : "Fichier généré dans votre navigateur"}
            </span>
            {busy ? (
              <button onClick={() => abort.current?.abort()}>
                Annuler l’export
              </button>
            ) : (
              <button
                className="gx-primary"
                disabled={exportKind === "sequence" && sequenceTooLarge}
                onClick={() => void exportNow()}
              >
                Télécharger
              </button>
            )}
          </div>
        </Modal>
      )}
    </main>
  );
}
function dataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
