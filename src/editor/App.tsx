import { useEffect, useRef, useState } from "react";
import type {
  Asset,
  Campaign,
  CreativeDirection,
  CreativeOverrides,
  EventRow,
  PlacementOverride,
  Value,
} from "../domain/model.js";
import { resolvePlacements, validateCampaign } from "../domain/core.js";
import { campaignDirection, recipeToDirection } from "../domain/creative.js";
import {
  ARCHIVE_LIMITS,
  exportZIP,
  importZIP,
  sha256,
} from "../storage/archive.js";
import { exportJSON, importJSON, MAX_JSON_BYTES } from "../storage/json.js";
import {
  IndexedDBCampaignStore,
  RevisionConflict,
} from "../storage/indexeddb.js";
import type { CampaignBundle } from "../storage/indexeddb.js";
import {
  activate,
  adjust,
  adjustCreativeDirection,
  edit,
  newCampaign,
  redo,
  resetCreativeDirection,
  setCreativeDirection,
  undo,
} from "./state.js";
import type { History } from "./state.js";
import { agenda, formats } from "./catalog.js";
import { Preview } from "./Preview.js";
import { Branding } from "./Branding.js";
import { attachResource } from "../domain/branding.js";
import { CreativeLab } from "./CreativeLab.js";

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
const fingerprint = (b: CampaignBundle) =>
  JSON.stringify({ ...b.campaign, revision: 0 });
function directionDiff(
  direction: CreativeDirection,
  inherited: CreativeDirection,
): CreativeOverrides {
  const result: CreativeOverrides = {};
  for (const key of [
    "energy",
    "colorExpression",
    "scale",
    "density",
    "dominant",
    "harmony",
    "imageAssetId",
  ] as const) {
    if (direction[key] !== inherited[key]) {
      const value =
        key === "imageAssetId"
          ? (direction.imageAssetId ?? null)
          : direction[key];
      Object.assign(result, { [key]: value });
    }
  }
  return result;
}
function download(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function App() {
  const [view, setView] = useState(() =>
    location.hash === "#branding"
      ? "branding"
      : location.hash === "#campagne"
        ? "campaign"
        : "lab",
  );
  useEffect(() => {
    const sync = () =>
      setView(
        location.hash === "#branding"
          ? "branding"
          : location.hash === "#campagne"
            ? "campaign"
            : "lab",
      );
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const [history, setHistory] = useState<History<CampaignBundle>>(() => ({
    past: [],
    present: newCampaign(),
    future: [],
  }));
  const bundle = history.present,
    campaign = bundle.campaign;
  const [expected, setExpected] = useState<number | null>(null),
    [saved, setSaved] = useState("");
  const [historyEpoch, setHistoryEpoch] = useState(0);
  const [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false),
    lock = useRef(false);
  const [listing, setListing] = useState<
    Array<Pick<Campaign, "id" | "name" | "revision">>
  >([]);
  const [storedId, setStoredId] = useState(""),
    [supportId, setSupportId] = useState(""),
    [variantId, setVariantId] = useState(""),
    [layerId, setLayerId] = useState("");
  const [layout, setLayout] = useState("square"),
    [rights, setRights] = useState("");
  const [resources, setResources] = useState<Asset[]>([]);
  const [resourceHash, setResourceHash] = useState("");
  const store = useRef<IndexedDBCampaignStore | null>(null);
  const dirty = saved !== fingerprint(bundle);
  const support =
    campaign.supports.find((s) => s.id === supportId) ?? campaign.supports[0];
  const variant =
    support?.variants.find((v) => v.id === variantId) ?? support?.variants[0];
  const layer =
    support?.template.layers.find((l) => l.id === layerId) ??
    support?.template.layers[0];
  let validation = "",
    placement: ReturnType<typeof resolvePlacements>[number] | undefined;
  try {
    validateCampaign(campaign);
    if (support && variant)
      placement = resolvePlacements(support, variant).find(
        (p) => p.layerId === layer?.id,
      );
  } catch (e) {
    validation = messageOf(e);
  }
  useEffect(() => {
    try {
      store.current = new IndexedDBCampaignStore();
      store.current
        .list()
        .then(setListing)
        .catch((e) =>
          setError(
            `Stockage indisponible : ${messageOf(e)}. Vous pouvez exporter votre campagne.`,
          ),
        );
    } catch (e) {
      setError(`Stockage indisponible : ${messageOf(e)}`);
    }
    return () => {
      void store.current?.close().catch(() => {});
    };
  }, []);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  function commit(next: CampaignBundle) {
    setHistory((h) => edit(h, next));
    setNotice("");
    setError("");
  }
  function change(fn: (c: Campaign) => void) {
    const next = structuredClone(campaign);
    fn(next);
    commit({ ...bundle, campaign: next });
  }
  function safe(fn: () => void) {
    try {
      fn();
      setError("");
    } catch (e) {
      setError(messageOf(e));
    }
  }
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(messageOf(e));
      if (e instanceof RevisionConflict) setConflict(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function reset(next: CampaignBundle, revision: number | null) {
    setHistory({ past: [], present: next, future: [] });
    setExpected(revision);
    setSaved(revision === null ? "" : fingerprint(next));
    setSupportId("");
    setVariantId("");
    setLayerId("");
    setConflict(false);
    setError("");
    setNotice("");
  }
  const discard = () =>
    !dirty || window.confirm("Abandonner les modifications non enregistrées ?");
  async function save(copy = false) {
    if (!store.current)
      throw new Error("Stockage indisponible. Exportez votre campagne.");
    const candidate = structuredClone(bundle);
    if (copy) {
      candidate.campaign.id = crypto.randomUUID();
      candidate.campaign.name += " — copie";
    }
    const result = await store.current.saveBundle(
      candidate,
      copy ? null : expected,
    );
    const next = { ...candidate, campaign: result };
    setHistory((h) =>
      copy ? { past: [], present: next, future: [] } : { ...h, present: next },
    );
    setExpected(result.revision);
    setSaved(fingerprint(next));
    setConflict(false);
    setNotice(`Enregistré localement · révision ${result.revision}`);
    setStoredId(result.id);
    setListing(await store.current.list());
  }
  async function load(id: string) {
    if (!store.current || !id || !discard()) return;
    const next = await store.current.loadBundle(id);
    reset(next, next.campaign.revision);
    setStoredId(id);
    setNotice("Campagne chargée.");
  }
  async function importFile(file: File) {
    if (!discard()) return;
    const zip = file.name.toLowerCase().endsWith(".zip");
    if (file.size > (zip ? ARCHIVE_LIMITS.bytes : MAX_JSON_BYTES))
      throw new Error("Fichier trop volumineux.");
    const next = zip
      ? await importZIP(new Uint8Array(await file.arrayBuffer()))
      : {
          campaign: importJSON(await file.text()),
          assets: new Map<string, Uint8Array>(),
        };
    // Import is always a new local document, never an implicit overwrite of the original.
    next.campaign.id = crypto.randomUUID();
    next.campaign.revision = 1;
    reset(next, null);
    setNotice(
      `Importé comme nouvelle campagne${!zip && next.campaign.assets.length ? " ; les images ne sont pas incluses dans le JSON. Importez le ZIP pour les restaurer." : "."}`,
    );
  }
  function patch(value: PlacementOverride, id = layer?.id) {
    if (!support || !variant || !id) return;
    safe(() =>
      commit({
        ...bundle,
        campaign: adjust(campaign, support.id, variant.id, id, value),
      }),
    );
  }
  async function addImage(file: File) {
    if (!support || !rights.trim())
      throw new Error(
        "Sélectionnez un support et renseignez les droits de l’image.",
      );
    if (
      !["image/png", "image/jpeg"].includes(file.type) ||
      file.size > ARCHIVE_LIMITS.entryBytes
    )
      throw new Error("Choisissez un PNG/JPEG de 32 Mio maximum.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const bitmap = await createImageBitmap(
      new Blob([bytes], { type: file.type }),
    );
    bitmap.close();
    const id = crypto.randomUUID(),
      path = `assets/${id}.${file.type === "image/png" ? "png" : "jpg"}`;
    let asset: Asset = {
      id,
      path,
      mimeType: file.type,
      sha256: await sha256(bytes),
      source: file.name,
      rights: rights.trim(),
    };
    if (store.current) asset = await store.current.importResource(asset, bytes);
    await placeImage(asset, bytes);
  }
  async function placeImage(asset: Asset, bytes: Uint8Array) {
    if (!support) throw new Error("Sélectionnez un support.");
    const next = structuredClone(bundle),
      s = next.campaign.supports.find((s) => s.id === support.id)!;
    const assetId = attachResource(next.campaign, asset);
    const target = next.campaign.assets.find((a) => a.id === assetId)!;
    next.assets.set(target.path, bytes);
    const id = crypto.randomUUID();
    if (!s.template.id.startsWith("local:")) {
      s.template.derivedFrom = {
        id: s.template.id,
        revision: s.template.revision,
      };
      s.template.id = `local:${crypto.randomUUID()}`;
      s.template.revision = 1;
    } else s.template.revision++;
    s.template.layers.push({
      id,
      type: "image",
      content: { value: { assetId } },
      editing: { move: true, resize: true, restyle: false, hide: true },
    });
    for (const l of s.template.layouts) {
      const f =
        s.variants.find((v) => v.layoutId === l.id)?.format ??
        formats.find(
          (f) => f.id === l.formatRef.id && f.revision === l.formatRef.revision,
        );
      const bounds = f?.surface ?? {
        width: l.placements[0]?.frame.width ?? 100,
        height: l.placements[0]?.frame.height ?? 100,
      };
      l.placements.push({
        layerId: id,
        frame: {
          x: bounds.width * 0.1,
          y: bounds.height * 0.55,
          width: bounds.width * 0.8,
          height: bounds.height * 0.35,
        },
        visible: true,
        rotation: 0,
        imageFit: { mode: "cover", focalX: 0.5, focalY: 0.5 },
      });
    }
    validateCampaign(next.campaign);
    await exportZIP(next.campaign, next.assets);
    commit(next);
    setLayerId(id);
    setNotice(
      "Image ajoutée au support. Déplacez-la et ajustez son recadrage.",
    );
  }
  function rows(key: string, fn: (events: EventRow[]) => void) {
    change((c) => fn(c.content[key] as EventRow[]));
  }
  const missing = campaign.assets.filter(
    (a) => !bundle.assets.has(a.path),
  ).length;
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">FT</span>
          <div>
            FLOW THERAPY <strong>Studio</strong>
          </div>
          <span className="version">0.3</span>
        </div>
        <span className="local-indicator">● Espace local</span>
      </header>
      <nav className="studio-navigation" aria-label="Espaces du studio">
        <button
          aria-pressed={view === "branding"}
          onClick={() => {
            location.hash = "branding";
            setView("branding");
          }}
        >
          Branding
        </button>
        <button
          disabled
          title="Le socle Éditorial sera livré dans la suite du jalon 0.3."
        >
          Éditorial <small>Bientôt</small>
        </button>
        <button
          disabled
          title="Le catalogue Médias sera livré dans la suite du jalon 0.3."
        >
          Médias <small>Bientôt</small>
        </button>
        <button
          className={view !== "branding" ? "studio-root-active" : ""}
          aria-pressed={view !== "branding"}
          onClick={() => {
            location.hash = "campagne";
            setView("campaign");
          }}
        >
          Campagnes
        </button>
        <span className="studio-subnavigation">
          <button
            aria-pressed={view === "lab"}
            onClick={() => {
              location.hash = "laboratoire";
              setView("lab");
            }}
          >
            ✧ Direction créative
          </button>
          <button
            aria-pressed={view === "campaign"}
            onClick={() => {
              location.hash = "campagne";
              setView("campaign");
            }}
          >
            Campagne
          </button>
        </span>
      </nav>
      <div hidden={view !== "branding"}>
        <Branding bundle={bundle} onApply={commit} />
      </div>
      <div hidden={view !== "lab"}>
        <CreativeLab
          campaign={campaign}
          assets={bundle.assets}
          historyEpoch={historyEpoch}
          onChange={(recipe, targetSupportId, imageAssetId) =>
            safe(() => {
              const direction = recipeToDirection(recipe, imageAssetId);
              const next = targetSupportId
                ? adjustCreativeDirection(
                    campaign,
                    targetSupportId,
                    directionDiff(direction, campaignDirection(campaign)),
                  )
                : setCreativeDirection(campaign, direction);
              commit({ ...bundle, campaign: next });
            })
          }
          onReset={(targetSupportId) =>
            safe(() =>
              commit({
                ...bundle,
                campaign: resetCreativeDirection(campaign, targetSupportId),
              }),
            )
          }
        />
      </div>
      <fieldset
        hidden={view !== "campaign"}
        className="workspace-fieldset"
        disabled={busy}
      >
        <div className="toolbar">
          <div>
            <span className="eyebrow">VOTRE ATELIER DE CAMPAGNES</span>
            <h1>{campaign.name || "Sans titre"}</h1>
            <span className="save-state">
              {dirty
                ? "Modifications non enregistrées"
                : `Enregistré · révision ${expected}`}
            </span>
          </div>
          <div className="actions">
            <button
              onClick={() => {
                if (discard()) reset(newCampaign(), null);
              }}
            >
              Nouvelle campagne
            </button>
            <button
              disabled={!history.past.length}
              onClick={() => {
                setHistory((h) => {
                  const next = undo(h);
                  return {
                    ...next,
                    present: {
                      ...next.present,
                      campaign: {
                        ...next.present.campaign,
                        revision: expected ?? 1,
                      },
                    },
                  };
                });
                setHistoryEpoch((value) => value + 1);
                setNotice("");
              }}
            >
              Annuler
            </button>
            <button
              disabled={!history.future.length}
              onClick={() => {
                setHistory((h) => {
                  const next = redo(h);
                  return {
                    ...next,
                    present: {
                      ...next.present,
                      campaign: {
                        ...next.present.campaign,
                        revision: expected ?? 1,
                      },
                    },
                  };
                });
                setHistoryEpoch((value) => value + 1);
                setNotice("");
              }}
            >
              Rétablir
            </button>
            <button
              className="primary"
              disabled={!!validation}
              onClick={() => void run(() => save())}
            >
              Enregistrer
            </button>
          </div>
        </div>
        <div className="feedback" aria-live="polite">
          {busy && <p role="status">Opération en cours…</p>}
          {notice && !busy && <p role="status">{notice}</p>}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {validation && (
            <p className="error" role="alert">
              Saisie à compléter : {validation}
            </p>
          )}
          {missing > 0 && (
            <p className="warning">
              {missing} ressource(s) absente(s). Le JSON conserve leurs
              références ; seul un ZIP complet transporte leurs fichiers.
            </p>
          )}
          {conflict && (
            <div className="conflict">
              <button onClick={() => void run(() => load(campaign.id))}>
                Recharger la version enregistrée
              </button>
              <button onClick={() => void run(() => save(true))}>
                Enregistrer une copie
              </button>
            </div>
          )}
        </div>
        <main className="workspace">
          <aside className="panel content-panel">
            <span className="eyebrow">01 / CONTENU COMMUN</span>
            <h2>La campagne</h2>
            <p className="hint">
              Identité :{" "}
              {campaign.brand
                ? `${campaign.brand.name} · r${campaign.brand.revision}`
                : "Aucune identité appliquée"}
            </p>
            <label>
              Nom de la campagne
              <input
                value={campaign.name}
                onChange={(e) =>
                  change((c) => {
                    c.name = e.target.value;
                  })
                }
              />
            </label>
            {Object.entries(campaign.content).map(([key, value]) =>
              typeof value === "string" ? (
                <label key={key}>
                  {key === "title" ? "Titre de la campagne" : key}
                  <textarea
                    value={value}
                    rows={2}
                    onChange={(e) =>
                      change((c) => {
                        c.content[key] = e.target.value;
                      })
                    }
                  />
                </label>
              ) : Array.isArray(value) ? (
                <section key={key} className="events">
                  <h3>
                    {key === "events" ? "Événements" : key}{" "}
                    <span className="count">{value.length}</span>
                  </h3>
                  {value.map((event, index) => (
                    <div className="event-card" key={event.id}>
                      <div className="event-heading">
                        <strong>{String(index + 1).padStart(2, "0")}</strong>
                        <div>
                          <button
                            aria-label={`Monter événement ${index + 1}`}
                            disabled={index === 0}
                            onClick={() =>
                              rows(key, (r) => {
                                [r[index - 1], r[index]] = [
                                  r[index],
                                  r[index - 1],
                                ];
                              })
                            }
                          >
                            ↑
                          </button>
                          <button
                            aria-label={`Descendre événement ${index + 1}`}
                            disabled={index === value.length - 1}
                            onClick={() =>
                              rows(key, (r) => {
                                [r[index], r[index + 1]] = [
                                  r[index + 1],
                                  r[index],
                                ];
                              })
                            }
                          >
                            ↓
                          </button>
                          <button
                            aria-label={`Supprimer événement ${index + 1}`}
                            onClick={() =>
                              rows(key, (r) => {
                                r.splice(index, 1);
                              })
                            }
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <label>
                        Date {index + 1}
                        <input
                          type="date"
                          value={event.date}
                          onChange={(e) =>
                            rows(key, (r) => {
                              r[index].date = e.target.value;
                            })
                          }
                        />
                      </label>
                      <label>
                        Libellé {index + 1}
                        <input
                          value={event.label}
                          onChange={(e) =>
                            rows(key, (r) => {
                              r[index].label = e.target.value;
                            })
                          }
                        />
                      </label>
                      <label>
                        Lieu {index + 1}
                        <input
                          value={event.location}
                          onChange={(e) =>
                            rows(key, (r) => {
                              r[index].location = e.target.value;
                            })
                          }
                        />
                      </label>
                    </div>
                  ))}
                  <button
                    className="wide"
                    onClick={() =>
                      rows(key, (r) =>
                        r.push({
                          id: crypto.randomUUID(),
                          date: localDate(),
                          label: "",
                          location: "",
                        }),
                      )
                    }
                  >
                    + Ajouter un événement
                  </button>
                </section>
              ) : (
                <p key={key}>Image référencée : {key}</p>
              ),
            )}
            <div className="divider" />
            <h3>Mes campagnes locales</h3>
            <label>
              Campagne enregistrée
              <select
                value={storedId}
                onChange={(e) => setStoredId(e.target.value)}
              >
                <option value="">Choisir…</option>
                {listing.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · r{c.revision}
                  </option>
                ))}
              </select>
            </label>
            <div className="actions">
              <button
                disabled={!storedId}
                onClick={() => void run(() => load(storedId))}
              >
                Ouvrir
              </button>
              <button
                onClick={() =>
                  void run(async () => {
                    if (!store.current)
                      throw new Error("Stockage indisponible.");
                    setListing(await store.current.list());
                  })
                }
              >
                Actualiser
              </button>
              <button
                disabled={!storedId}
                onClick={() =>
                  void run(async () => {
                    const c = listing.find((c) => c.id === storedId);
                    if (
                      !c ||
                      !store.current ||
                      !window.confirm(`Supprimer « ${c.name} » du navigateur ?`)
                    )
                      return;
                    await store.current.delete(c.id, c.revision);
                    setListing(await store.current.list());
                    setStoredId("");
                    if (c.id === campaign.id) {
                      setExpected(null);
                      setSaved("");
                    }
                    setNotice("Copie locale supprimée.");
                  })
                }
              >
                Supprimer
              </button>
            </div>
          </aside>
          <section className="canvas-panel">
            <div className="canvas-heading">
              <div>
                <span className="eyebrow">02 / COMPOSITION</span>
                <h2>{variant?.format.name ?? "Votre support"}</h2>
              </div>
              <span className="draft-badge">APERÇU PROVISOIRE</span>
            </div>
            <Preview
              bundle={bundle}
              supportId={support?.id ?? ""}
              variantId={variant?.id ?? ""}
              selected={layer?.id ?? ""}
              select={setLayerId}
              move={(id, x, y) => {
                const p =
                  support &&
                  variant &&
                  resolvePlacements(support, variant).find(
                    (p) => p.layerId === id,
                  );
                if (p) patch({ frame: { ...p.frame, x, y } }, id);
              }}
            />
          </section>
          <aside className="panel adjustment-panel">
            <span className="eyebrow">03 / AJUSTEMENTS LOCAUX</span>
            <h2>Supports & calques</h2>
            <label>
              Template
              <select aria-label="Template">
                <option>Agenda — prototype</option>
              </select>
            </label>
            <label>
              Format à activer
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
              >
                {agenda.layouts.map((l) => (
                  <option key={l.id} value={l.id}>
                    {formats.find((f) => f.id === l.formatRef.id)?.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="wide"
              onClick={() =>
                safe(() => {
                  const next = activate(campaign, agenda, formats, layout);
                  commit({ ...bundle, campaign: next });
                  setSupportId(next.supports.at(-1)!.id);
                  setVariantId("");
                  setLayerId("");
                })
              }
            >
              Activer le template
            </button>
            {support && (
              <>
                <label>
                  Support actif
                  <select
                    value={support.id}
                    onChange={(e) => {
                      setSupportId(e.target.value);
                      setVariantId("");
                      setLayerId("");
                    }}
                  >
                    {campaign.supports.map((s, i) => (
                      <option key={s.id} value={s.id}>
                        {i + 1}. {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Variante active
                  <select
                    value={variant?.id ?? ""}
                    onChange={(e) => {
                      setVariantId(e.target.value);
                      setLayerId("");
                    }}
                  >
                    {support.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.format.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={() =>
                    change((c) => {
                      c.supports = c.supports.filter(
                        (s) => s.id !== support.id,
                      );
                    })
                  }
                >
                  Retirer ce support
                </button>
                <div className="divider" />
                <label>
                  Calque sélectionné
                  <select
                    value={layer?.id ?? ""}
                    onChange={(e) => setLayerId(e.target.value)}
                  >
                    {support.template.layers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.type === "image" ? "Image" : l.id}
                      </option>
                    ))}
                  </select>
                </label>
                {placement && layer && (
                  <>
                    <p className="hint">
                      Glissez le calque dans l’aperçu, ou utilisez les flèches
                      du clavier. Les ajustements concernent uniquement cette
                      variante.
                    </p>
                    <div className="number-grid">
                      {(["x", "y", "width", "height"] as const).map((key) => (
                        <label key={key}>
                          {
                            {
                              x: "Position X",
                              y: "Position Y",
                              width: "Largeur",
                              height: "Hauteur",
                            }[key]
                          }
                          <input
                            type="number"
                            step="any"
                            disabled={
                              key === "x" || key === "y"
                                ? !layer.editing.move
                                : !layer.editing.resize
                            }
                            value={
                              Math.round(placement!.frame[key] * 100) / 100
                            }
                            onChange={(e) => {
                              if (e.target.value !== "")
                                patch({
                                  frame: {
                                    ...placement!.frame,
                                    [key]: e.target.valueAsNumber,
                                  },
                                });
                            }}
                          />
                        </label>
                      ))}
                    </div>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={placement.visible}
                        disabled={!layer.editing.hide}
                        onChange={(e) => patch({ visible: e.target.checked })}
                      />
                      Calque visible
                    </label>
                    {layer.type === "image" && (
                      <fieldset disabled={!layer.editing.resize}>
                        <legend>Recadrage de l’image</legend>
                        <label>
                          Ajustement
                          <select
                            value={placement.imageFit?.mode ?? "cover"}
                            onChange={(e) =>
                              patch({
                                imageFit: {
                                  focalX: 0.5,
                                  focalY: 0.5,
                                  ...placement!.imageFit,
                                  mode: e.target.value as "cover" | "contain",
                                },
                              })
                            }
                          >
                            <option value="cover">Remplir / recadrer</option>
                            <option value="contain">Image entière</option>
                          </select>
                        </label>
                        {(["focalX", "focalY"] as const).map((key) => (
                          <label key={key}>
                            {key === "focalX"
                              ? "Cadrage horizontal"
                              : "Cadrage vertical"}
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={placement!.imageFit?.[key] ?? 0.5}
                              onChange={(e) =>
                                patch({
                                  imageFit: {
                                    mode: "cover",
                                    focalX: 0.5,
                                    focalY: 0.5,
                                    ...placement!.imageFit,
                                    [key]: e.target.valueAsNumber,
                                  },
                                })
                              }
                            />
                          </label>
                        ))}
                      </fieldset>
                    )}
                    <button
                      onClick={() =>
                        change((c) => {
                          delete c.supports
                            .find((s) => s.id === support.id)!
                            .variants.find((v) => v.id === variant!.id)!
                            .placementOverrides[layer.id];
                        })
                      }
                    >
                      Réinitialiser les ajustements
                    </button>
                  </>
                )}
                <div className="divider" />
                <h3>Ressources partagées</h3>
                <button
                  onClick={() =>
                    void run(async () => {
                      if (!store.current)
                        throw new Error("Stockage indisponible.");
                      setResources(await store.current.listResources());
                    })
                  }
                >
                  Parcourir les ressources
                </button>
                <label>
                  Image du studio
                  <select
                    value={resourceHash}
                    onChange={(e) => setResourceHash(e.target.value)}
                  >
                    <option value="">Choisir une image…</option>
                    {resources
                      .filter((a) => a.mimeType.startsWith("image/"))
                      .map((a) => (
                        <option key={a.sha256} value={a.sha256}>
                          {a.source}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  disabled={!resourceHash || !!validation}
                  onClick={() =>
                    void run(async () => {
                      if (!store.current)
                        throw new Error("Stockage indisponible.");
                      const { asset, bytes } =
                        await store.current.loadResource(resourceHash);
                      await placeImage(asset, bytes);
                    })
                  }
                >
                  Utiliser cette image
                </button>
                <h3>Ajouter une image</h3>
                <label>
                  Droits / autorisation
                  <input
                    placeholder="Ex. création personnelle"
                    value={rights}
                    onChange={(e) => setRights(e.target.value)}
                  />
                </label>
                <label className="file-label">
                  Image PNG ou JPEG
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    disabled={!rights.trim() || !!validation}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void run(() => addImage(file));
                    }}
                  />
                </label>
              </>
            )}
            <div className="divider" />
            <h3>Sauvegardes portables</h3>
            <p className="hint">
              Le ZIP inclut les images. Le JSON contient les données et leurs
              références.
            </p>
            <div className="actions">
              <button
                disabled={!!validation}
                onClick={() =>
                  safe(() =>
                    download(
                      exportJSON(campaign),
                      "campaign.json",
                      "application/json",
                    ),
                  )
                }
              >
                Exporter JSON
              </button>
              <button
                disabled={!!validation || missing > 0}
                onClick={() =>
                  void run(async () =>
                    download(
                      new Uint8Array(await exportZIP(campaign, bundle.assets)),
                      "campaign.zip",
                      "application/zip",
                    ),
                  )
                }
              >
                Exporter ZIP
              </button>
            </div>
            <label className="file-label">
              Importer JSON ou ZIP
              <input
                type="file"
                accept=".json,.zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void run(() => importFile(file));
                }}
              />
            </label>
            <p className="hint">
              Les données restent dans ce navigateur. Exportez un ZIP pour les
              sauvegarder durablement.
            </p>
          </aside>
        </main>
      </fieldset>
      <footer>
        FLOW THERAPY STUDIO{" "}
        <span>Campagnes communes, compositions singulières.</span>
      </footer>
    </div>
  );
}
