import { useEffect, useRef, useState } from "react";
import type { Asset, EditorialDocument } from "../domain/model.js";
import { validateEditorial } from "../domain/core.js";
import {
  editorialKinds,
  editorialStatuses,
  newEditorial,
} from "../domain/editorial.js";
import { IndexedDBCampaignStore } from "../storage/indexeddb.js";
import { exportEditorial, restoreEditorial } from "../storage/editorial.js";
import { ARCHIVE_LIMITS } from "../storage/archive.js";
import { EditorialText } from "./EditorialText.js";
import {
  ResourceLibrary,
  ResourceThumbnail,
  saveDownload,
} from "./ResourceLibrary.js";
import "./editorial.css";

export function Editorial({
  active,
  onUse,
  onInsert,
}: {
  active: boolean;
  onUse: (
    document: EditorialDocument,
    store: IndexedDBCampaignStore,
  ) => Promise<void>;
  onInsert?: (asset: Asset, bytes: Uint8Array) => Promise<void>;
}) {
  const [store] = useState(() => new IndexedDBCampaignStore());
  const [documents, setDocuments] = useState<EditorialDocument[]>([]);
  const [draft, setDraft] = useState(() => newEditorial(crypto.randomUUID()));
  const [saved, setSaved] = useState(() => JSON.stringify(draft));
  const [expected, setExpected] = useState<number | null>(null);
  const [libraryOpened, setLibraryOpened] = useState(false);
  const [tab, setTab] = useState<"content" | "resources">("content");
  const [query, setQuery] = useState(""),
    [kind, setKind] = useState("all"),
    [status, setStatus] = useState("all");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [showResources, setShowResources] = useState(false),
    body = useRef<HTMLTextAreaElement>(null);
  const dirty = saved !== JSON.stringify(draft);
  async function refresh() {
    setDocuments(await store.listEditorial());
  }
  useEffect(() => {
    return () => {
      void store.close().catch(() => {});
    };
  }, [store]);
  useEffect(() => {
    if (active) void refresh().catch((e) => setError(String(e)));
  }, [active, store]);
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
  function discard() {
    return (
      !dirty ||
      window.confirm(
        "Abandonner les modifications non enregistrées de ce contenu ?",
      )
    );
  }
  function open(document: EditorialDocument, revision: number | null) {
    setDraft(structuredClone(document));
    setTagsInput(document.tags.join(", "));
    setExpected(revision);
    setSaved(JSON.stringify(document));
    setError("");
    setNotice("");
    setShowResources(false);
  }
  function change(patch: Partial<EditorialDocument>) {
    setDraft((d) => ({ ...d, ...patch }));
    setNotice("");
  }
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function save(copy = false) {
    const candidate = structuredClone(draft);
    if (copy) {
      candidate.id = crypto.randomUUID();
      candidate.revision = 1;
    }
    const result = await store.saveEditorial(candidate, copy ? null : expected);
    open(result, result.revision);
    await refresh();
    setNotice(`Contenu enregistré localement · révision ${result.revision}`);
  }
  function format(prefix: string, suffix = "") {
    const textarea = body.current;
    if (!textarea) return;
    const start = textarea.selectionStart,
      end = textarea.selectionEnd;
    const value = draft.body;
    change({
      body:
        value.slice(0, start) +
        prefix +
        value.slice(start, end) +
        suffix +
        value.slice(end),
    });
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  }
  let validation = "";
  try {
    validateEditorial(draft);
  } catch (e) {
    validation = e instanceof Error ? e.message : String(e);
  }
  const needle = query
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const filtered = documents.filter(
    (d) =>
      (kind === "all" || kind === d.kind) &&
      (status === "all" || status === d.status) &&
      `${d.title} ${d.summary} ${d.tags.join(" ")} ${d.event?.date ?? ""}`
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .includes(needle),
  );
  return (
    <main className="editorial-workspace">
      <header className="editorial-section-header">
        <div>
          <span className="eyebrow">MATIÈRE À COMMUNIQUER</span>
          <h1>Éditorial</h1>
          <p>
            Rédigez vos contenus, associez leurs ressources, puis
            sélectionnez-les dans vos campagnes.
          </p>
        </div>
      </header>
      <nav className="editorial-tabs" aria-label="Sections éditoriales">
        <button
          aria-pressed={tab === "content"}
          onClick={() => setTab("content")}
        >
          Contenus
        </button>
        <button
          aria-pressed={tab === "resources"}
          onClick={() => {
            setLibraryOpened(true);
            setTab("resources");
          }}
        >
          Médiathèque
        </button>
        <button disabled title="Objectifs, publics et rythme éditorial à venir">
          Ligne éditoriale · à venir
        </button>
      </nav>
      <div hidden={tab !== "resources"}>
        {libraryOpened && <ResourceLibrary onInsert={onInsert} />}
      </div>
      <div hidden={tab !== "content"} className="editorial-layout">
        <aside className="editorial-catalogue">
          <h2>Mes contenus</h2>
          <div className="actions">
            <button
              disabled={busy}
              onClick={() => {
                if (discard()) open(newEditorial(crypto.randomUUID()), null);
              }}
            >
              Nouveau contenu
            </button>
            <button disabled={busy} onClick={() => void run(refresh)}>
              Actualiser les contenus
            </button>
          </div>
          <label>
            Rechercher un contenu
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Titre, thème ou date"
            />
          </label>
          <label>
            Filtrer par type
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">Tous les types</option>
              {Object.entries(editorialKinds).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Filtrer par statut
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Tous les statuts</option>
              {Object.entries(editorialStatuses).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="editorial-cards">
            {filtered.map((d) => (
              <button
                className="editorial-card"
                key={d.id}
                disabled={busy}
                aria-pressed={expected !== null && draft.id === d.id}
                onClick={() => {
                  if (discard())
                    void run(async () => {
                      const current = await store.loadEditorial(d.id);
                      open(current, current.revision);
                    });
                }}
              >
                <span>
                  {editorialKinds[d.kind]} · {editorialStatuses[d.status]}
                </span>
                <strong>{d.title}</strong>
                <small>
                  Révision {d.revision}
                  {d.event?.date ? ` · ${d.event.date}` : ""} ·{" "}
                  {d.assets.length} image(s)
                </small>
              </button>
            ))}
          </div>
          {!filtered.length && (
            <p className="hint">Aucun contenu enregistré correspondant.</p>
          )}
          <label>
            Restaurer un contenu ZIP
            <input
              disabled={busy}
              type="file"
              accept=".zip"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file || !discard()) return;
                void run(async () => {
                  if (file.size > ARCHIVE_LIMITS.bytes)
                    throw new Error("Archive trop volumineuse.");
                  const result = await restoreEditorial(
                    new Uint8Array(await file.arrayBuffer()),
                    store,
                    crypto.randomUUID(),
                  );
                  open(result, result.revision);
                  await refresh();
                  setNotice("Contenu restauré comme nouvelle copie locale.");
                });
              }}
            />
          </label>
        </aside>
        <section
          className="editorial-authoring"
          aria-label="Rédaction du contenu"
        >
          {error && <p role="alert">{error}</p>}
          {notice && <p role="status">{notice}</p>}
          <div className="editorial-section-header">
            <h2>{expected === null ? "Nouveau contenu" : "Rédaction"}</h2>
            <span className="hint">
              {dirty
                ? "Modifications non enregistrées"
                : expected === null
                  ? "Brouillon non enregistré"
                  : `Enregistré · r${expected}`}
            </span>
          </div>
          <fieldset disabled={busy}>
            <div className="editorial-filters">
              <label>
                Type de contenu
                <select
                  value={draft.kind}
                  onChange={(e) => {
                    const kind = e.target.value as EditorialDocument["kind"];
                    if (
                      draft.event &&
                      (draft.event.date || draft.event.location) &&
                      kind !== "event" &&
                      !window.confirm(
                        "Retirer les détails de date et lieu en changeant de type ?",
                      )
                    )
                      return;
                    const next = { ...draft, kind };
                    if (kind === "event")
                      next.event ??= { date: "", location: "" };
                    else delete next.event;
                    setDraft(next);
                  }}
                >
                  {Object.entries(editorialKinds).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Statut du contenu
                <select
                  value={draft.status}
                  onChange={(e) =>
                    change({
                      status: e.target.value as EditorialDocument["status"],
                    })
                  }
                >
                  {Object.entries(editorialStatuses).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Titre du contenu
              <input
                value={draft.title}
                onChange={(e) => change({ title: e.target.value })}
              />
            </label>
            <label>
              Résumé du contenu
              <textarea
                rows={3}
                value={draft.summary}
                onChange={(e) => change({ summary: e.target.value })}
              />
            </label>
            {draft.event && (
              <div className="editorial-filters">
                <label>
                  Date de l’événement
                  <input
                    type="date"
                    value={draft.event.date}
                    onChange={(e) =>
                      change({
                        event: { ...draft.event!, date: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  Lieu de l’événement
                  <input
                    value={draft.event.location}
                    onChange={(e) =>
                      change({
                        event: { ...draft.event!, location: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
            )}
            <label>
              Corps du contenu
              <textarea
                ref={body}
                rows={14}
                value={draft.body}
                onChange={(e) => change({ body: e.target.value })}
              />
            </label>
            <div
              className="actions"
              role="group"
              aria-label="Mise en forme du contenu"
            >
              <button onClick={() => format("**", "**")}>Gras</button>
              <button onClick={() => format("*", "*")}>Italique</button>
              <button onClick={() => format("\n## ")}>Sous-titre</button>
              <button onClick={() => format("\n- ")}>Élément de liste</button>
            </div>
            <p className="hint">
              Mise en forme simple en Markdown. HTML, liens et contenus externes
              ne sont pas exécutés. Le corps complet est conservé.
            </p>
            <label>
              Thèmes du contenu
              <input
                value={tagsInput}
                onChange={(e) => {
                  setTagsInput(e.target.value);
                  change({
                    tags: [
                      ...new Set(
                        e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      ),
                    ],
                  });
                }}
                placeholder="Concert, coulisses…"
              />
            </label>
            <h3>Images associées</h3>
            <div className="resource-grid">
              {draft.assets.map((a) => (
                <div className="resource-card" key={a.sha256}>
                  <ResourceThumbnail asset={a} store={store} />
                  <span>{a.source}</span>
                  <button
                    onClick={() =>
                      change({
                        assets: draft.assets.filter(
                          (asset) => asset.sha256 !== a.sha256,
                        ),
                      })
                    }
                  >
                    Dissocier {a.source}
                  </button>
                </div>
              ))}
            </div>
            <button
              aria-expanded={showResources}
              onClick={() => setShowResources(!showResources)}
            >
              {showResources
                ? "Fermer le choix des images"
                : "Choisir des images dans la médiathèque"}
            </button>
            {showResources && active && (
              <ResourceLibrary
                selectedHashes={draft.assets.map((a) => a.sha256)}
                onSelect={(asset) => {
                  if (!draft.assets.some((a) => a.sha256 === asset.sha256))
                    change({ assets: [...draft.assets, asset] });
                }}
              />
            )}
            {validation && (dirty || draft.title) && (
              <p className="hint">Saisie à compléter : {validation}</p>
            )}
            <div className="actions editorial-save-actions">
              <button
                disabled={!!validation || (!dirty && expected !== null)}
                onClick={() => void run(() => save())}
              >
                Enregistrer le contenu
              </button>
              <button
                disabled={!!validation}
                onClick={() => void run(() => save(true))}
              >
                Enregistrer une copie du contenu
              </button>
              <button
                disabled={expected === null}
                onClick={() => {
                  if (discard())
                    void run(async () => {
                      const current = await store.loadEditorial(draft.id);
                      open(current, current.revision);
                    });
                }}
              >
                Recharger le contenu
              </button>
              <button
                disabled={!!validation}
                onClick={() =>
                  void run(async () =>
                    saveDownload(
                      await exportEditorial(draft, store),
                      "contenu-editorial.zip",
                    ),
                  )
                }
              >
                Exporter le contenu ZIP
              </button>
              <button
                disabled={
                  dirty || expected === null || draft.status === "archived"
                }
                onClick={() =>
                  void run(async () => {
                    await onUse(structuredClone(draft), store);
                    setNotice(
                      "Copie de cette révision ajoutée à la campagne. Enregistrez la campagne pour la conserver.",
                    );
                  })
                }
              >
                Ajouter ce contenu à la campagne
              </button>
            </div>
            <p className="hint">
              La campagne conserve la révision sélectionnée. Réécrire cet
              article ne modifie pas ses supports existants. « Prêt » ne
              signifie pas publié.
            </p>
          </fieldset>
          <details className="editorial-details" open>
            <summary>Aperçu du contenu</summary>
            <article className="editorial-reading">
              <h2>{draft.title || "Sans titre"}</h2>
              {draft.summary && <p>{draft.summary}</p>}
              <EditorialText text={draft.body} />
            </article>
          </details>
        </section>
      </div>
    </main>
  );
}
