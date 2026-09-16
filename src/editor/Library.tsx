import { useEffect, useMemo, useState } from "react";
import type { Asset, EditorialDocument } from "../domain/model.js";
import { buildLibraryIndex } from "../domain/library.js";
import type { LibraryEntry } from "../domain/library.js";
import type { CampaignBundle } from "../storage/indexeddb.js";
import { IndexedDBCampaignStore } from "../storage/indexeddb.js";
import { BrandConfigurationStore } from "../storage/brand-configuration.js";
import { Editorial } from "./Editorial.js";
import { ResourceLibrary, ResourceThumbnail } from "./ResourceLibrary.js";
import "./library.css";

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr");

function usageLabel(kind: "brand" | "campaign" | "editorial") {
  return {
    brand: "Marque",
    campaign: "Campagnes",
    editorial: "Contenus",
  }[kind];
}

export function Library({
  active,
  bundle,
  onUse,
  onInsert,
}: {
  active: boolean;
  bundle: CampaignBundle;
  onUse: (
    document: EditorialDocument,
    store: IndexedDBCampaignStore,
  ) => Promise<void>;
  onInsert?: (asset: Asset, bytes: Uint8Array) => Promise<void>;
}) {
  const [store] = useState(() => new IndexedDBCampaignStore()),
    [brandStore] = useState(() => new BrandConfigurationStore());
  const [entries, setEntries] = useState<LibraryEntry[]>([]),
    [query, setQuery] = useState(""),
    [type, setType] = useState<"all" | "image" | "font" | "other">("all"),
    [selectedHash, setSelectedHash] = useState("");
  const [tab, setTab] = useState<"resources" | "contents">("resources"),
    [manage, setManage] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const [resources, campaignsIndex, editorial, configurations] =
        await Promise.all([
          store.listResources(),
          store.list(),
          store.listEditorial(),
          brandStore.list(),
        ]);
      const campaigns = await Promise.all(
        campaignsIndex.map(({ id }) => store.load(id)),
      );
      const currentAlreadyStored = campaigns.some(
        (campaign) => campaign.id === bundle.campaign.id,
      );
      const allCampaigns = currentAlreadyStored
        ? campaigns.map((campaign) =>
            campaign.id === bundle.campaign.id ? bundle.campaign : campaign,
          )
        : [...campaigns, bundle.campaign];
      const next = buildLibraryIndex(
        resources,
        allCampaigns,
        editorial,
        configurations[0] ?? null,
      );
      setEntries(next);
      setSelectedHash((current) =>
        current && next.some((entry) => entry.asset.sha256 === current)
          ? current
          : (next[0]?.asset.sha256 ?? ""),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (active && tab === "resources") void refresh();
  }, [active, tab, bundle.campaign]);
  useEffect(
    () => () => {
      void store.close().catch(() => {});
      void brandStore.close().catch(() => {});
    },
    [store, brandStore],
  );

  const filtered = useMemo(() => {
    const needle = normalize(query);
    return entries.filter(
      (entry) =>
        (type === "all" || entry.kind === type) &&
        normalize(
          `${entry.asset.source} ${entry.asset.credit ?? ""} ${entry.asset.rights} ${entry.usages.map((usage) => `${usage.label} ${usage.role ?? ""}`).join(" ")}`,
        ).includes(needle),
    );
  }, [entries, query, type]);
  const selected =
    entries.find((entry) => entry.asset.sha256 === selectedHash) ?? filtered[0];
  const usageGroups = selected
    ? Object.groupBy(selected.usages, (usage) => usage.kind)
    : {};

  return (
    <main className="library-shell">
      <header className="library-heading">
        <div>
          <span className="eyebrow">BIBLIOTHÈQUE</span>
          <h1>Matière réutilisable du studio</h1>
          <p>
            Ressources et contenus partagés. Les fichiers restent stockés une seule
            fois ; cette vue expose leurs métadonnées et leurs usages.
          </p>
        </div>
        <div className="library-tabs" role="tablist" aria-label="Bibliothèque">
          <button
            role="tab"
            aria-selected={tab === "resources"}
            onClick={() => setTab("resources")}
          >
            Ressources
          </button>
          <button
            role="tab"
            aria-selected={tab === "contents"}
            onClick={() => setTab("contents")}
          >
            Contenus
          </button>
        </div>
      </header>

      {error && <p className="error" role="alert">{error}</p>}

      <div hidden={tab !== "resources"}>
        <div className="library-toolbar">
          <label>
            Rechercher
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom, crédit, droit ou usage…"
            />
          </label>
          <label>
            Type
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as typeof type)
              }
            >
              <option value="all">Tous</option>
              <option value="image">Images</option>
              <option value="font">Polices</option>
              <option value="other">Autres</option>
            </select>
          </label>
          <button disabled={busy} onClick={() => void refresh()}>
            {busy ? "Actualisation…" : "Actualiser"}
          </button>
          <button aria-pressed={manage} onClick={() => setManage((value) => !value)}>
            Gérer fichiers et métadonnées
          </button>
        </div>

        {manage ? (
          <section className="library-management">
            <p className="hint">
              Outils de transition : import, sauvegarde ZIP et modification des
              métadonnées utilisent directement le même catalogue dédupliqué.
            </p>
            <ResourceLibrary onInsert={onInsert} />
          </section>
        ) : (
          <section className="library-grid">
            <aside className="library-catalog" aria-label="Catalogue des ressources">
              <div className="library-panel-heading">
                <span className="eyebrow">RESSOURCES</span>
                <strong>{filtered.length}</strong>
              </div>
              <div className="library-entry-list">
                {filtered.map((entry) => (
                  <button
                    key={entry.asset.sha256}
                    className={
                      selected?.asset.sha256 === entry.asset.sha256 ? "selected" : ""
                    }
                    aria-pressed={selected?.asset.sha256 === entry.asset.sha256}
                    onClick={() => setSelectedHash(entry.asset.sha256)}
                  >
                    <ResourceThumbnail asset={entry.asset} store={store} />
                    <span>
                      <strong>{entry.asset.source}</strong>
                      <small>
                        {entry.kind} · {entry.usages.length} usage(s)
                      </small>
                    </span>
                  </button>
                ))}
              </div>
              {!filtered.length && <p>Aucune ressource correspondante.</p>}
            </aside>

            <article className="library-detail">
              {selected ? (
                <>
                  <header>
                    <span className="eyebrow">FICHE RESSOURCE</span>
                    <h2>{selected.asset.source}</h2>
                    <code>{selected.asset.sha256}</code>
                  </header>
                  <div className="library-preview">
                    <ResourceThumbnail asset={selected.asset} store={store} />
                  </div>
                  <dl className="library-metadata">
                    <div>
                      <dt>Type</dt>
                      <dd>{selected.asset.mimeType}</dd>
                    </div>
                    <div>
                      <dt>Crédit</dt>
                      <dd>{selected.asset.credit || "Non renseigné"}</dd>
                    </div>
                    <div>
                      <dt>Droits</dt>
                      <dd>{selected.asset.rights}</dd>
                    </div>
                    <div>
                      <dt>Chemin logique</dt>
                      <dd>{selected.asset.path}</dd>
                    </div>
                  </dl>
                  <p className="hint">
                    Les modifications de métadonnées du catalogue n’altèrent jamais
                    les instantanés déjà enregistrés dans les campagnes ou contenus.
                  </p>
                </>
              ) : (
                <p>Sélectionnez une ressource.</p>
              )}
            </article>

            <aside className="library-usages" aria-label="Usages de la ressource">
              <div className="library-panel-heading">
                <div>
                  <span className="eyebrow">USAGES</span>
                  <h2>Dépendances</h2>
                </div>
                <strong>{selected?.usages.length ?? 0}</strong>
              </div>
              {(["brand", "campaign", "editorial"] as const).map((kind) => {
                const usages = usageGroups[kind] ?? [];
                return (
                  <section key={kind}>
                    <h3>{usageLabel(kind)}</h3>
                    {usages.length ? (
                      <ul>
                        {usages.map((usage) => (
                          <li key={usage.id}>
                            <strong>{usage.label}</strong>
                            {usage.role && <span>{usage.role}</span>}
                            {usage.releaseVersion && (
                              <small>Release {usage.releaseVersion}</small>
                            )}
                            <small>{usage.snapshot ? "Instantané" : "Référence active"}</small>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="hint">Aucun usage connu.</p>
                    )}
                  </section>
                );
              })}
            </aside>
          </section>
        )}
      </div>

      <div hidden={tab !== "contents"}>
        <Editorial
          active={active && tab === "contents"}
          onUse={onUse}
          onInsert={onInsert}
        />
      </div>
    </main>
  );
}
