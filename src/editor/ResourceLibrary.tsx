import { useEffect, useState } from "react";
import type { Asset } from "../domain/model.js";
import { IndexedDBCampaignStore } from "../storage/indexeddb.js";
import {
  ARCHIVE_LIMITS,
  exportZIP,
  importZIP,
  sha256,
} from "../storage/archive.js";
import { resourceBundle } from "../storage/editorial.js";

export function saveDownload(bytes: Uint8Array, name: string) {
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], { type: "application/zip" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ResourceThumbnail({
  asset,
  store,
}: {
  asset: Asset;
  store: IndexedDBCampaignStore;
}) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true,
      url = "";
    setUrl("");
    setError("");
    if (["image/png", "image/jpeg"].includes(asset.mimeType)) {
      void store
        .loadResource(asset.sha256)
        .then(({ bytes }) => {
          if (!live) return;
          url = URL.createObjectURL(
            new Blob([new Uint8Array(bytes)], { type: asset.mimeType }),
          );
          setUrl(url);
        })
        .catch(() => {
          if (live) setError("Fichier indisponible");
        });
    }
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [asset.sha256, asset.mimeType, store]);
  return (
    <div className="resource-thumbnail">
      {error ? (
        <span>{error}</span>
      ) : url ? (
        <img
          src={url}
          alt={asset.source}
          onError={() => setError("Image illisible")}
        />
      ) : (
        <span>{asset.mimeType.startsWith("font/") ? "Aa" : "Image"}</span>
      )}
    </div>
  );
}
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr");
export function ResourceLibrary({
  onSelect,
  selectedHashes = [],
  onInsert,
}: {
  onSelect?: (asset: Asset) => void;
  selectedHashes?: string[];
  onInsert?: (asset: Asset, bytes: Uint8Array) => Promise<void>;
}) {
  const [store] = useState(() => new IndexedDBCampaignStore());
  const [resources, setResources] = useState<Asset[]>([]),
    [query, setQuery] = useState("");
  const [type, setType] = useState("all"),
    [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [rights, setRights] = useState(""),
    [credit, setCredit] = useState("");
  const [editing, setEditing] = useState<Asset | null>(null),
    [metadata, setMetadata] = useState({ source: "", rights: "", credit: "" });
  const metadataDirty =
    !!editing &&
    (metadata.source !== editing.source ||
      metadata.rights !== editing.rights ||
      metadata.credit !== (editing.credit ?? ""));
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (metadataDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [metadataDirty]);
  function discardMetadata() {
    return (
      !metadataDirty ||
      window.confirm(
        "Abandonner les modifications des informations de cette ressource ?",
      )
    );
  }
  async function refresh() {
    setResources(await store.listResources());
  }
  useEffect(() => {
    void refresh().catch((e) => setError(String(e)));
    return () => {
      void store.close().catch(() => {});
    };
  }, [store]);
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
  async function importFile(file: File) {
    if (!rights.trim())
      throw new Error("Renseignez les droits avant l’import.");
    if (file.size > ARCHIVE_LIMITS.entryBytes)
      throw new Error("Fichier supérieur à 32 Mio.");
    const types: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      ttf: "font/ttf",
      otf: "font/otf",
      woff: "font/woff",
      woff2: "font/woff2",
    };
    const extension = file.name.split(".").at(-1)!.toLowerCase(),
      mimeType = types[extension];
    if (!mimeType || (onSelect && !mimeType.startsWith("image/")))
      throw new Error("Choisissez un PNG/JPEG ou une police compatible.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (mimeType.startsWith("image/")) {
      const bitmap = await createImageBitmap(
        new Blob([bytes], { type: mimeType }),
      );
      const pixels = bitmap.width * bitmap.height;
      bitmap.close();
      if (pixels > 64_000_000)
        throw new Error("Image supérieure à 64 mégapixels.");
    }
    const id = crypto.randomUUID();
    const asset = await store.importResource(
      {
        id,
        path: `assets/${id}.${extension}`,
        sha256: await sha256(bytes),
        mimeType,
        source: file.name,
        rights: rights.trim(),
        ...(credit.trim() ? { credit: credit.trim() } : {}),
      },
      bytes,
    );
    await refresh();
    setQuery("");
    setType("all");
    setPage(0);
    setNotice(
      `Ressource disponible : ${asset.source}. Les fichiers identiques sont réutilisés avec leurs métadonnées existantes.`,
    );
  }
  const filtered = resources.filter(
    (a) =>
      (!onSelect || a.mimeType.startsWith("image/")) &&
      (type === "all" || a.mimeType.startsWith(type)) &&
      normalize(`${a.source} ${a.credit ?? ""} ${a.rights}`).includes(
        normalize(query),
      ),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 12)),
    current = Math.min(page, pages - 1);
  return (
    <section
      className="resource-library"
      aria-label={onSelect ? "Choix des images associées" : "Médiathèque"}
    >
      <header className="editorial-section-header">
        <div>
          <h2>{onSelect ? "Associer des images" : "Médiathèque"}</h2>
          <p className="hint">
            Fichiers locaux communs au Branding, à l’Éditorial et aux campagnes.
            PNG/JPEG et polices ; SVG, audio et vidéo non pris en charge.
          </p>
        </div>
        <button type="button" disabled={busy} onClick={() => void run(refresh)}>
          Actualiser les ressources
        </button>
      </header>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <fieldset disabled={busy}>
        <div className="editorial-filters">
          <label>
            Rechercher une ressource
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          {!onSelect && (
            <label>
              Type de ressource
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">Toutes</option>
                <option value="image/">Images</option>
                <option value="font/">Polices</option>
              </select>
            </label>
          )}
        </div>
        <details className="editorial-details">
          <summary>Importer des ressources</summary>
          <label>
            Droits de la ressource
            <input value={rights} onChange={(e) => setRights(e.target.value)} />
          </label>
          <label>
            Crédit de la ressource
            <input value={credit} onChange={(e) => setCredit(e.target.value)} />
          </label>
          <label>
            Fichier à importer
            <input
              type="file"
              accept={
                onSelect
                  ? ".png,.jpg,.jpeg"
                  : ".png,.jpg,.jpeg,.ttf,.otf,.woff,.woff2"
              }
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void run(() => importFile(file));
              }}
            />
          </label>
        </details>
        {!onSelect && (
          <details className="editorial-details">
            <summary>Sauvegarder la médiathèque</summary>
            <p className="hint">
              Le ZIP contient toutes les ressources, pas seulement les résultats
              filtrés. La restauration ajoute les fichiers sans remplacer leurs
              métadonnées existantes.
            </p>
            <button
              type="button"
              onClick={() =>
                void run(async () => {
                  const bundle = await resourceBundle(
                    store,
                    await store.listResources(),
                  );
                  saveDownload(
                    await exportZIP(bundle.campaign, bundle.assets),
                    "mediatheque.zip",
                  );
                })
              }
            >
              Exporter la médiathèque ZIP
            </button>
            <label>
              Restaurer des ressources ZIP
              <input
                type="file"
                accept=".zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file)
                    void run(async () => {
                      if (file.size > ARCHIVE_LIMITS.bytes)
                        throw new Error("Archive trop volumineuse.");
                      const bundle = await importZIP(
                        new Uint8Array(await file.arrayBuffer()),
                      );
                      for (const a of bundle.campaign.assets)
                        await store.importResource(
                          a,
                          bundle.assets.get(a.path)!,
                        );
                      await refresh();
                      setNotice(
                        "Ressources restaurées. Les documents de campagne ne sont pas importés par cette action.",
                      );
                    });
                }}
              />
            </label>
          </details>
        )}
        <p className="hint">{filtered.length} ressource(s)</p>
        <div className="resource-grid">
          {filtered.slice(current * 12, (current + 1) * 12).map((a) => (
            <article className="resource-card" key={a.sha256}>
              <ResourceThumbnail asset={a} store={store} />
              <h3>{a.source}</h3>
              <p className="hint">
                {a.mimeType}
                {a.credit ? ` · ${a.credit}` : ""}
              </p>
              <details>
                <summary>Droits</summary>
                <p className="resource-rights">{a.rights}</p>
              </details>
              {onSelect ? (
                <button
                  type="button"
                  disabled={selectedHashes.includes(a.sha256)}
                  onClick={() => onSelect(a)}
                >
                  {selectedHashes.includes(a.sha256)
                    ? "Déjà associée"
                    : `Associer ${a.source}`}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (!discardMetadata()) return;
                      setEditing(a);
                      setMetadata({
                        source: a.source,
                        rights: a.rights,
                        credit: a.credit ?? "",
                      });
                    }}
                  >
                    Modifier les informations de {a.source}
                  </button>
                  {onInsert && a.mimeType.startsWith("image/") && (
                    <button
                      type="button"
                      onClick={() =>
                        void run(async () => {
                          const { bytes } = await store.loadResource(a.sha256);
                          await onInsert(a, bytes);
                          setNotice(
                            "Image insérée dans le support actif. Enregistrez la campagne.",
                          );
                        })
                      }
                    >
                      Insérer {a.source} dans le support
                    </button>
                  )}
                </>
              )}
            </article>
          ))}
        </div>
        {!filtered.length && (
          <p>Aucune ressource correspondant à cette recherche.</p>
        )}
        <div className="editorial-pagination">
          <button disabled={!current} onClick={() => setPage(current - 1)}>
            Ressources précédentes
          </button>
          <span>
            {current + 1} / {pages}
          </span>
          <button
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Ressources suivantes
          </button>
        </div>
        {editing && (
          <section
            className="resource-metadata"
            aria-label="Informations de la ressource"
          >
            <h3>Informations de {editing.source}</h3>
            <p className="hint">
              Ces modifications concernent le catalogue. Les instantanés déjà
              associés aux articles et campagnes restent inchangés.
            </p>
            <label>
              Nom de la ressource
              <input
                value={metadata.source}
                onChange={(e) =>
                  setMetadata({ ...metadata, source: e.target.value })
                }
              />
            </label>
            <label>
              Droits enregistrés
              <textarea
                value={metadata.rights}
                onChange={(e) =>
                  setMetadata({ ...metadata, rights: e.target.value })
                }
              />
            </label>
            <label>
              Crédit enregistré
              <input
                value={metadata.credit}
                onChange={(e) =>
                  setMetadata({ ...metadata, credit: e.target.value })
                }
              />
            </label>
            <div className="actions">
              <button
                onClick={() =>
                  void run(async () => {
                    await store.updateResource(editing, metadata);
                    setEditing(null);
                    await refresh();
                    setNotice("Informations enregistrées.");
                  })
                }
              >
                Enregistrer les informations
              </button>
              <button
                onClick={() => {
                  if (discardMetadata()) setEditing(null);
                }}
              >
                Fermer les informations
              </button>
            </div>
          </section>
        )}
      </fieldset>
    </section>
  );
}
