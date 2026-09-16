import { useEffect, useMemo, useRef, useState } from "react";
import type { Brand } from "../domain/model.js";
import { applyBrand } from "../domain/branding.js";
import {
  analyzeImpact,
  brandFromRelease,
  createDraft,
  latestRelease,
  migrateBrandV2,
  migrateCampaignBrand,
  publishDraft,
  updateColorToken,
} from "../domain/brand-configuration.js";
import type {
  BrandConfiguration,
  BrandObject,
  ImpactUsage,
} from "../domain/brand-configuration.js";
import type { CampaignBundle } from "../storage/indexeddb.js";
import { IndexedDBCampaignStore } from "../storage/indexeddb.js";
import {
  BrandConfigurationStore,
  exportBrandConfiguration,
  importBrandConfiguration,
} from "../storage/brand-configuration.js";
import { templates } from "./catalog.js";
import { flowTherapySiteBrand } from "./siteBrand.js";
import "./brand-configuration.css";

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
function defaultLegacyBundle(): CampaignBundle {
  const brand: Brand = {
    schemaVersion: 2,
    id: "local:flow-therapy",
    revision: 1,
    ...flowTherapySiteBrand,
    fonts: {},
    logos: {},
  };
  return {
    campaign: {
      schemaVersion: 3,
      id: "studio-brand",
      revision: 1,
      name: brand.name,
      locale: "fr-FR",
      content: {},
      supports: [],
      assets: [],
      brand,
    },
    assets: new Map(),
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
    "color-token": "Couleurs",
    "font-role": "Typographies",
    logo: "Logos",
    component: "Composants",
    rule: "Règles",
  }[type];
}
function groupObjects(objects: BrandObject[]) {
  const groups: Record<string, BrandObject[]> = {};
  for (const object of objects) (groups[typeLabel(object.type)] ??= []).push(object);
  return groups;
}

export function BrandWorkspace({
  bundle,
  onApply,
}: {
  bundle: CampaignBundle;
  onApply: (next: CampaignBundle) => void;
}) {
  const configStore = useRef<BrandConfigurationStore | null>(null),
    legacyStore = useRef<IndexedDBCampaignStore | null>(null),
    lock = useRef(false);
  const [configuration, setConfiguration] = useState<BrandConfiguration | null>(null);
  const [legacyBundle, setLegacyBundle] = useState<CampaignBundle | null>(null);
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
      const stored = await legacyStore.current.loadBrand();
      const legacy = stored ?? defaultLegacyBundle();
      const baseBrand = legacy.campaign.brand!;
      let document = await configStore.current.load(baseBrand.id);
      if (!document)
        document = await configStore.current.save(migrateBrandV2(baseBrand), null);
      if (!active) return;
      setLegacyBundle(legacy);
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
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const release = configuration ? latestRelease(configuration) : null,
    draft = configuration
      ? configuration.draft ?? createDraft(configuration)
      : null,
    selected = draft?.objects.find((object) => object.id === selectedId),
    baseRelease = configuration?.releases.find(
      (candidate) => candidate.id === draft?.baseReleaseId,
    ),
    before = baseRelease?.objects.find((object) => object.id === selectedId);

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
    if (bundle.campaign.brand)
      result.push({
        id: `campaign:${bundle.campaign.id}`,
        label: bundle.campaign.name || "Campagne courante",
        kind: "campaign",
        objectIds: ["color.primary"],
        migration: "automatic",
      });
    return result;
  }, [bundle.campaign.brand, bundle.campaign.id, bundle.campaign.name]);
  const impact = draft ? analyzeImpact(draft, usages) : null,
    hasErrors = impact?.findings.some((finding) => finding.severity === "error") ?? false;

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
    const published = publishDraft(
      configuration,
      draft,
      impact,
      new Date().toISOString(),
    );
    const saved = await configStore.current.save(published, expectedRevision);
    setConfiguration(saved);
    setExpectedRevision(saved.revision);
    setDirty(false);
    setNotice(
      `Release ${latestRelease(saved).version} publiée. Les campagnes existantes n’ont pas été modifiées.`,
    );
  }
  function useReleaseInCampaign() {
    if (!configuration || !legacyBundle) return;
    const target = latestRelease(configuration);
    if (bundle.campaign.brand) {
      onApply({
        ...bundle,
        campaign: migrateCampaignBrand(bundle.campaign, target),
      });
      setNotice(
        `Campagne « ${bundle.campaign.name} » migrée dans l’éditeur. Enregistrez la campagne pour conserver ce nouvel instantané.`,
      );
      return;
    }
    const targetBrand = brandFromRelease(legacyBundle.campaign.brand!, target),
      campaign = applyBrand(
        bundle.campaign,
        targetBrand,
        legacyBundle.campaign.assets,
      ),
      assets = new Map(bundle.assets);
    for (const asset of campaign.assets) {
      const source = legacyBundle.campaign.assets.find(
        (candidate) => candidate.sha256 === asset.sha256,
      );
      const bytes = source && legacyBundle.assets.get(source.path);
      if (bytes) assets.set(asset.path, bytes);
    }
    onApply({ campaign, assets });
    setNotice(
      `Release ${target.version} appliquée à la campagne dans l’éditeur. Enregistrez la campagne pour conserver cet instantané.`,
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

  if (!ready || !configuration || !draft || !release || !legacyBundle) {
    return (
      <main className="brand-config-shell">
        <p role={error ? "alert" : "status"} className={error ? "error" : ""}>
          {error || "Chargement de la configuration de marque…"}
        </p>
      </main>
    );
  }

  const grouped = groupObjects(draft.objects),
    primary = draft.objects.find((object) => object.id === "color.primary"),
    basePrimary = baseRelease?.objects.find(
      (object) => object.id === "color.primary",
    ),
    currentPrimary = bundle.campaign.brand?.colors.blue?.toUpperCase(),
    releasePrimary = objectValue(
      release.objects.find((object) => object.id === "color.primary"),
    ).toUpperCase(),
    campaignCurrent = Boolean(currentPrimary && currentPrimary === releasePrimary);

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
              aria-label="Importer une configuration de marque"
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
              busy || !draft.changeSet.operations.length || hasErrors
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
          {error.includes("autre onglet") && (
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
                {objects.map((object) => (
                  <button
                    key={object.id}
                    className={selectedId === object.id ? "selected" : ""}
                    aria-pressed={selectedId === object.id}
                    onClick={() => setSelectedId(object.id)}
                  >
                    {object.type === "color-token" && typeof object.value === "string" ? (
                      <span
                        className="brand-config-swatch"
                        style={{ background: object.value }}
                        aria-hidden="true"
                      />
                    ) : (
                      <span aria-hidden="true">·</span>
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
                      style={{ borderColor: objectValue(before ?? basePrimary) }}
                    >
                      <strong style={{ color: objectValue(before ?? basePrimary) }}>FLOW THERAPY</strong>
                      <span>Musique · Énergie · Émotion</span>
                    </div>
                  </div>
                  <div>
                    <small>Brouillon</small>
                    <div
                      className="brand-config-preview-card"
                      style={{ borderColor: objectValue(selected) || objectValue(primary) }}
                    >
                      <strong style={{ color: objectValue(selected) || objectValue(primary) }}>FLOW THERAPY</strong>
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
            {impact?.templates.length ? (
              <ul>
                {impact.templates.map((usage) => <li key={usage.id}>{usage.label}</li>)}
              </ul>
            ) : (
              <p className="hint">Aucun tant que le brouillon est aligné.</p>
            )}
          </section>
          <section>
            <h3>Campagne courante</h3>
            {bundle.campaign.brand && impact?.campaigns.length ? (
              <ul>
                {impact.campaigns.map((usage) => <li key={usage.id}>{usage.label}</li>)}
              </ul>
            ) : (
              <p className="hint">
                {bundle.campaign.brand
                  ? "L’instantané actuel reste inchangé jusqu’à une migration explicite."
                  : "Aucune release n’est encore attachée à cette campagne."}
              </p>
            )}
            <button
              className="wide"
              disabled={campaignCurrent}
              onClick={useReleaseInCampaign}
            >
              {campaignCurrent
                ? `Campagne alignée sur release ${release.version}`
                : bundle.campaign.brand
                  ? `Migrer vers release ${release.version}`
                  : `Utiliser release ${release.version}`}
            </button>
          </section>
          <section>
            <h3>Publication</h3>
            <p className="hint">
              Enregistrer garde un brouillon local. Publier crée une release immuable et ne migre aucune campagne automatiquement.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
