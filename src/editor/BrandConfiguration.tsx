import { useEffect, useMemo, useRef, useState } from "react";
import type { Brand } from "../domain/model.js";
import {
  analyzeImpact,
  createDraft,
  latestRelease,
  migrateBrandV2,
  migrateCampaignBrand,
  publishDraft,
  updateColorToken,
} from "../domain/brand-configuration.js";
import type {
  BrandConfiguration as BrandConfigurationDocument,
  BrandObject,
  ImpactUsage,
} from "../domain/brand-configuration.js";
import type { CampaignBundle } from "../storage/indexeddb.js";
import { IndexedDBCampaignStore } from "../storage/indexeddb.js";
import {
  BrandConfigurationConflict,
  BrandConfigurationStore,
  exportBrandConfiguration,
  importBrandConfiguration,
} from "../storage/brand-configuration.js";
import { templates } from "./catalog.js";
import { flowTherapySiteBrand } from "./siteBrand.js";
import "./brand-configuration.css";

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
function defaultLegacyBrand(): Brand {
  return {
    schemaVersion: 2,
    id: "local:flow-therapy",
    revision: 1,
    ...flowTherapySiteBrand,
    fonts: {},
    logos: {},
  };
}
function download(text: string, fileName: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function objectValue(object?: BrandObject) {
  return typeof object?.value === "string" ? object.value : "";
}
function typeLabel(type: BrandObject["type"]) {
  return {
    "color-token": "Couleur",
    "font-role": "Typographie",
    logo: "Logo",
    component: "Composant",
    rule: "Règle",
  }[type];
}

export function BrandConfiguration({
  bundle,
  onApply,
}: {
  bundle: CampaignBundle;
  onApply: (next: CampaignBundle) => void;
}) {
  const configStore = useRef<BrandConfigurationStore | null>(null),
    legacyStore = useRef<IndexedDBCampaignStore | null>(null),
    operationLock = useRef(false);
  const [configuration, setConfiguration] =
    useState<BrandConfigurationDocument | null>(null);
  const [legacyBrand, setLegacyBrand] = useState<Brand | null>(null);
  const [expectedRevision, setExpectedRevision] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState("color.primary");
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState(""),
    [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      configStore.current = new BrandConfigurationStore();
      legacyStore.current = new IndexedDBCampaignStore();
      const storedLegacy = await legacyStore.current.loadBrand();
      const base =
        storedLegacy?.campaign.brand ?? bundle.campaign.brand ?? defaultLegacyBrand();
      let document = await configStore.current.load(base.id);
      if (!document) {
        document = await configStore.current.save(migrateBrandV2(base), null);
      }
      if (!active) return;
      setLegacyBrand(structuredClone(base));
      setConfiguration(document);
      setExpectedRevision(document.revision);
      setReady(true);
    };
    void load().catch((cause) => setError(messageOf(cause)));
    return () => {
      active = false;
      void configStore.current?.close().catch(() => {});
      void legacyStore.current?.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);

  async function run(action: () => Promise<void>) {
    if (operationLock.current) return;
    operationLock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      operationLock.current = false;
      setBusy(false);
    }
  }

  const release = configuration ? latestRelease(configuration) : null;
  const draft = configuration
    ? configuration.draft ?? createDraft(configuration)
    : null;
  const selected = draft?.objects.find((object) => object.id === selectedId);
  const baseRelease = configuration?.releases.find(
    (candidate) => candidate.id === draft?.baseReleaseId,
  );
  const before = baseRelease?.objects.find((object) => object.id === selectedId);

  const usages = useMemo<ImpactUsage[]>(() => {
    const result: ImpactUsage[] = templates.map((template) => ({
      id: `template:${template.id}`,
      label: template.name,
      kind: "template",
      objectIds: ["color.primary", "component.brand-accent"],
      migration: "manual",
    }));
    result.push({
      id: "component:brand-accent",
      label: "Accent de marque",
      kind: "component",
      objectIds: ["color.primary"],
      migration: "automatic",
    });
    if (bundle.campaign.brand) {
      result.push({
        id: `campaign:${bundle.campaign.id}`,
        label: bundle.campaign.name || "Campagne courante",
        kind: "campaign",
        objectIds: ["color.primary"],
        migration: "automatic",
      });
    }
    return result;
  }, [bundle.campaign.brand, bundle.campaign.id, bundle.campaign.name]);
  const impact = draft ? analyzeImpact(draft, usages) : null;
  const hasErrors = impact?.findings.some((finding) => finding.severity === "error");

  function editPrimary(value: string) {
    if (!configuration || !draft) return;
    try {
      const nextDraft = updateColorToken(draft, "color.primary", value);
      setConfiguration({ ...configuration, draft: nextDraft });
      setDirty(true);
      setError("");
      setNotice("");
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  async function saveDraft() {
    if (!configuration || !configStore.current) return;
    const saved = await configStore.current.save(configuration, expectedRevision);
    setConfiguration(saved);
    setExpectedRevision(saved.revision);
    setDirty(false);
    setNotice(`Brouillon enregistré localement · révision ${saved.revision}.`);
  }
  async function publish() {
    if (!configuration || !draft || !impact || !configStore.current) return;
    const next = publishDraft(
      configuration,
      draft,
      impact,
      new Date().toISOString(),
    );
    const saved = await configStore.current.save(next, expectedRevision);
    setConfiguration(saved);
    setExpectedRevision(saved.revision);
    setDirty(false);
    setNotice(
      `Release ${latestRelease(saved).version} publiée. Les campagnes existantes n’ont pas été modifiées.`,
    );
  }
  function migrateCampaign() {
    if (!configuration || !legacyBrand || !bundle.campaign.brand) return;
    const nextCampaign = migrateCampaignBrand(
      bundle.campaign,
      latestRelease(configuration),
    );
    onApply({ ...bundle, campaign: nextCampaign });
    setNotice(
      `Campagne « ${bundle.campaign.name} » migrée dans l’éditeur. Enregistrez la campagne pour conserver ce nouvel instantané.`,
    );
  }
  async function importDocument(file: File) {
    if (!configStore.current) return;
    if (dirty && !window.confirm("Remplacer le brouillon non enregistré ?")) return;
    const imported = importBrandConfiguration(await file.text());
    const saved = await configStore.current.replaceImported(imported);
    setConfiguration(saved);
    setExpectedRevision(saved.revision);
    setSelectedId("color.primary");
    setDirty(false);
    setNotice("Configuration importée comme nouvelle révision locale.");
  }

  if (!ready || !configuration || !draft || !release) {
    return (
      <main className="brand-config-shell">
        <p role={error ? "alert" : "status"} className={error ? "error" : ""}>
          {error || "Chargement de la configuration de marque…"}
        </p>
      </main>
    );
  }

  const grouped = Object.groupBy(draft.objects, (object) => typeLabel(object.type));
  const primary = draft.objects.find((object) => object.id === "color.primary");
  const basePrimary = baseRelease?.objects.find(
    (object) => object.id === "color.primary",
  );
  const campaignAlreadyCurrent =
    bundle.campaign.brand?.colors.blue?.toUpperCase() === objectValue(primary).toUpperCase();

  return (
    <main className="brand-config-shell">
      <header className="brand-config-heading">
        <div>
          <span className="eyebrow">MARQUE / CONFIGURATION</span>
          <h1>{configuration.name}</h1>
          <div className="brand-config-statusline">
            <span className="brand-config-release">Release {release.version}</span>
            <span className={dirty ? "brand-config-draft dirty" : "brand-config-draft"}>
              {draft.changeSet.operations.length
                ? `${draft.changeSet.operations.length} changement(s) dans le brouillon`
                : "Brouillon aligné sur la release"}
            </span>
            <span>révision locale {configuration.revision}</span>
          </div>
        </div>
        <div className="actions brand-config-actions">
          <button
            onClick={() =>
              download(
                exportBrandConfiguration(configuration),
                `flow-therapy-brand-r${configuration.revision}.json`,
              )
            }
          >
            Exporter
          </button>
          <label className="button-like">
            Importer
            <input
              hidden
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = "";
                if (file) void run(() => importDocument(file));
              }}
            />
          </label>
          <button disabled={!dirty || busy} onClick={() => void run(saveDraft)}>
            Enregistrer le brouillon
          </button>
          <button
            className="primary"
            disabled={
              busy ||
              !draft.changeSet.operations.length ||
              Boolean(hasErrors)
            }
            onClick={() => void run(publish)}
          >
            Publier la release
          </button>
        </div>
      </header>

      {(notice || error) && (
        <div className="brand-config-feedback" aria-live="polite">
          {notice && !error && <p role="status">{notice}</p>}
          {error && <p role="alert" className="error">{error}</p>}
          {error && error.includes("autre onglet") && (
            <button
              onClick={() =>
                void run(async () => {
                  const fresh = await configStore.current!.load(configuration.brandId);
                  if (!fresh) throw new Error("Configuration introuvable.");
                  setConfiguration(fresh);
                  setExpectedRevision(fresh.revision);
                  setDirty(false);
                  setNotice("Configuration rechargée.");
                })
              }
            >
              Recharger
            </button>
          )}
        </div>
      )}

      <section className="brand-config-grid">
        <aside className="brand-config-catalog" aria-label="Catalogue de marque">
          <div className="brand-config-panel-heading">
            <span className="eyebrow">OBJETS</span>
            <strong>{draft.objects.length}</strong>
          </div>
          {Object.entries(grouped).map(([group, objects]) => (
            <section key={group}>
              <h2>{group}</h2>
              <div className="brand-config-object-list">
                {(objects ?? []).map((object) => (
                  <button
                    key={object.id}
                    className={selectedId === object.id ? "selected" : ""}
                    aria-pressed={selectedId === object.id}
                    onClick={() => setSelectedId(object.id)}
                  >
                    {object.type === "color-token" && typeof object.value === "string" && (
                      <span
                        className="brand-config-swatch"
                        style={{ background: object.value }}
                        aria-hidden="true"
                      />
                    )}
                    <span>
                      <strong>{object.label}</strong>
                      <small>{object.id}</small>
                    </span>
                    {object.status === "draft" && <i>Brouillon</i>}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </aside>

        <article className="brand-config-editor">
          {selected ? (
            <>
              <header className="brand-config-object-heading">
                <div>
                  <span className="eyebrow">{typeLabel(selected.type).toUpperCase()}</span>
                  <h2>{selected.label}</h2>
                  <code>{selected.id}</code>
                </div>
                <span className={selected.status === "draft" ? "state-pill draft" : "state-pill"}>
                  {selected.status === "draft" ? "Brouillon" : `Publié · r${selected.revision}`}
                </span>
              </header>

              <section className="brand-config-section">
                <div>
                  <span className="eyebrow">DÉFINITION</span>
                  <h3>Valeur structurée</h3>
                </div>
                {selected.id === "color.primary" ? (
                  <div className="brand-config-color-editor">
                    <input
                      aria-label="Couleur primaire"
                      type="color"
                      value={objectValue(selected)}
                      onChange={(event) => editPrimary(event.target.value)}
                    />
                    <input
                      aria-label="Valeur color.primary"
                      value={objectValue(selected)}
                      onChange={(event) => editPrimary(event.target.value)}
                    />
                  </div>
                ) : (
                  <pre>{JSON.stringify(selected.value, null, 2)}</pre>
                )}
                {selected.metadata && (
                  <dl className="brand-config-metadata">
                    {Object.entries(selected.metadata).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>

              <section className="brand-config-section">
                <div>
                  <span className="eyebrow">RÈGLES</span>
                  <h3>Contrôles applicables</h3>
                </div>
                <div className="brand-config-findings">
                  {impact?.findings
                    .filter((finding) => finding.scopeId === selected.id)
                    .map((finding) => (
                      <div className={`finding ${finding.severity}`} key={finding.id}>
                        <span>{finding.severity === "error" ? "À corriger" : "Valide"}</span>
                        <p>{finding.message}</p>
                      </div>
                    ))}
                  {!impact?.findings.some((finding) => finding.scopeId === selected.id) && (
                    <p className="hint">Aucun contrôle spécifique dans cette tranche.</p>
                  )}
                </div>
              </section>

              <section className="brand-config-section">
                <div>
                  <span className="eyebrow">APERÇU</span>
                  <h3>Avant / après</h3>
                </div>
                <div className="brand-config-comparison">
                  <div>
                    <small>Release {baseRelease?.version}</small>
                    <div
                      className="brand-config-preview-card"
                      style={{ borderColor: objectValue(basePrimary) }}
                    >
                      <strong style={{ color: objectValue(basePrimary) }}>FLOW THERAPY</strong>
                      <span>Musique · Énergie · Émotion</span>
                    </div>
                  </div>
                  <div>
                    <small>Brouillon</small>
                    <div
                      className="brand-config-preview-card"
                      style={{ borderColor: objectValue(primary) }}
                    >
                      <strong style={{ color: objectValue(primary) }}>FLOW THERAPY</strong>
                      <span>Musique · Énergie · Émotion</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="brand-config-section">
                <div>
                  <span className="eyebrow">USAGES</span>
                  <h3>Dépendances connues</h3>
                </div>
                <div className="brand-config-usage-chips">
                  {draft.relations
                    .filter((relation) => relation.targetId === selected.id)
                    .map((relation) => {
                      const source = draft.objects.find(
                        (object) => object.id === relation.sourceId,
                      );
                      return (
                        <span key={relation.id}>
                          {source?.label ?? relation.sourceId} · {relation.type}
                        </span>
                      );
                    })}
                </div>
              </section>

              <section className="brand-config-section">
                <div>
                  <span className="eyebrow">HISTORIQUE</span>
                  <h3>Versions publiées</h3>
                </div>
                <div className="brand-config-history">
                  {[...configuration.releases].reverse().map((item) => (
                    <div key={item.id}>
                      <strong>Release {item.version}</strong>
                      <span>{item.createdAt}</span>
                      <code>{item.fingerprint}</code>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <p>Sélectionnez un objet de marque.</p>
          )}
        </article>

        <aside className="brand-config-impact" aria-label="Analyse d’impact">
          <div className="brand-config-panel-heading">
            <div>
              <span className="eyebrow">IMPACT</span>
              <h2>Conséquences</h2>
            </div>
            <span className={hasErrors ? "impact-state error" : "impact-state"}>
              {hasErrors ? "Bloqué" : "Complet"}
            </span>
          </div>
          <section>
            <h3>Lot de changements</h3>
            {draft.changeSet.operations.length ? (
              draft.changeSet.operations.map((operation) => (
                <div className="impact-change" key={operation.id}>
                  <strong>{operation.objectId}</strong>
                  <span>{String(operation.before)} → {String(operation.after)}</span>
                </div>
              ))
            ) : (
              <p className="hint">Aucun changement.</p>
            )}
          </section>
          <section>
            <h3>Objets dépendants</h3>
            <p className="impact-count">{impact?.dependentIds.length ?? 0}</p>
            <div className="brand-config-usage-chips">
              {impact?.dependentIds.map((id) => (
                <span key={id}>{draft.objects.find((object) => object.id === id)?.label ?? id}</span>
              ))}
            </div>
          </section>
          <section>
            <h3>Templates concernés</h3>
            <ul>
              {impact?.templates.map((usage) => <li key={usage.id}>{usage.label}</li>)}
            </ul>
          </section>
          <section>
            <h3>Campagnes</h3>
            {impact?.campaigns.length ? (
              <>
                <ul>
                  {impact.campaigns.map((usage) => <li key={usage.id}>{usage.label}</li>)}
                </ul>
                <p className="hint">
                  La publication n’altère pas leur instantané. La migration reste une action séparée.
                </p>
                <button
                  className="wide"
                  disabled={!bundle.campaign.brand || campaignAlreadyCurrent}
                  onClick={migrateCampaign}
                >
                  {campaignAlreadyCurrent
                    ? "Campagne déjà alignée"
                    : `Migrer vers release ${release.version}`}
                </button>
              </>
            ) : (
              <p className="hint">Aucune campagne chargée avec une identité.</p>
            )}
          </section>
          <section>
            <h3>Publication</h3>
            <p className="hint">
              La release est immuable. Enregistrer le brouillon ne publie rien ; publier crée une nouvelle version atomique.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}

export { BrandConfigurationConflict };
