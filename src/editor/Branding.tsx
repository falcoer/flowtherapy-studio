import { useEffect, useRef, useState } from "react";
import type { Asset, Brand } from "../domain/model.js";
import { applyBrand, attachResource } from "../domain/branding.js";
import type { WebsiteBrandTheme } from "../domain/website-brand.js";
import { loadWebsiteBrandPreset } from "../storage/website-brand.js";
import { BrandSpecimen, WebsiteBrandPreset } from "./WebsiteBrandPreset.js";
import { BrandPalette } from "./BrandPalette.js";
import { flowTherapySiteBrand } from "./siteBrand.js";
import { IndexedDBCampaignStore } from "../storage/indexeddb.js";
import type { CampaignBundle } from "../storage/indexeddb.js";
import { ARCHIVE_LIMITS, exportZIP, importZIP, sha256 } from "../storage/archive.js";
import "./branding.css";

const fontRoles = { title: "Titres", body: "Corps", caption: "Légendes" };
const logoRoles = { primary: "Principal", light: "Sur fond clair", dark: "Sur fond sombre" };

function initial(): CampaignBundle {
  return {
    campaign: {
      schemaVersion: 2, id: "studio-brand", revision: 1,
      name: "Identité du studio", locale: "fr-FR", content: {}, supports: [], assets: [],
      brand: {
        schemaVersion: 2, id: "local:studio-brand", revision: 1,
        ...structuredClone(flowTherapySiteBrand), fonts: {}, logos: {},
      },
    },
    assets: new Map(),
  };
}
function download(bytes: Uint8Array) {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/zip" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "branding.zip";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Branding({ bundle, onApply }: {
  bundle: CampaignBundle;
  onApply: (next: CampaignBundle) => void;
}) {
  const [store] = useState(() => new IndexedDBCampaignStore());
  const [draft, setDraft] = useState(initial);
  const [expected, setExpected] = useState<number | null>(null);
  const [resources, setResources] = useState<Asset[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [credit, setCredit] = useState("");
  const [rights, setRights] = useState("");
  const brand = draft.campaign.brand!;

  async function refresh() {
    setResources(await store.listResources());
  }
  async function readPreset(theme: WebsiteBrandTheme) {
    const next = await loadWebsiteBrandPreset(theme, document.baseURI);
    for (const asset of next.campaign.assets)
      await store.importResource(asset, next.assets.get(asset.path)!);
    return next;
  }
  async function installPreset(theme: WebsiteBrandTheme) {
    const next = await readPreset(theme);
    setDraft(next);
    setDirty(true);
    await refresh();
    setNotice("Préréglage Flow Therapy chargé. Enregistrez l’identité avant de l’appliquer à une campagne.");
  }
  async function reload() {
    const saved = await store.loadBrand();
    if (saved) {
      setDraft(saved);
      setExpected(saved.campaign.revision);
      setDirty(false);
    } else {
      setExpected(null);
      try {
        setDraft(await readPreset("light"));
        setDirty(true);
        setNotice("L’identité Flow Therapy du site est prête. Enregistrez-la pour la conserver dans ce navigateur.");
      } catch (e) {
        setDraft(initial());
        setDirty(false);
        setError(`Le préréglage Flow Therapy n’a pas pu être chargé. Vous pouvez réessayer ou personnaliser l’identité manuellement. ${String(e)}`);
      }
    }
    await refresh();
    setReady(true);
  }
  useEffect(() => {
    void reload().catch((e) => setError(String(e)));
    return () => { void store.close().catch(() => {}); };
  }, [store]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (dirty) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);

  const lock = useRef(false);
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try { await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  function update(fn: (brand: Brand) => void) {
    const next = structuredClone(draft);
    fn(next.campaign.brand!);
    setDraft(next);
    setDirty(true);
    setNotice("");
  }
  function loadSiteBrand() {
    if (!window.confirm("Recharger les couleurs du site ? Les logos, polices et campagnes restent inchangés.")) return;
    update((b) => {
      b.name = flowTherapySiteBrand.name;
      b.description = flowTherapySiteBrand.description;
      b.tags = [...flowTherapySiteBrand.tags];
      b.colors = { ...flowTherapySiteBrand.colors };
    });
    setNotice("Couleurs de la charte rechargées. Les logos et polices déjà associés sont conservés.");
  }
  async function assign(kind: "fonts" | "logos", role: string, hash: string) {
    const next = structuredClone(draft);
    const roles = (next.campaign.brand![kind] ??= {});
    if (!hash) delete roles[role];
    else {
      const { asset, bytes } = await store.loadResource(hash);
      const assetId = attachResource(next.campaign, asset);
      const target = next.campaign.assets.find((a) => a.id === assetId)!;
      next.assets.set(target.path, bytes);
      roles[role] = { assetId };
    }
    const used = new Set([
      ...Object.values(next.campaign.brand!.fonts),
      ...Object.values(next.campaign.brand!.logos ?? {}),
    ].map((r) => r.assetId));
    next.campaign.assets = next.campaign.assets.filter((a) => used.has(a.id));
    next.assets = new Map(next.campaign.assets.flatMap((a) => {
      const bytes = next.assets.get(a.path);
      return bytes ? [[a.path, bytes] as const] : [];
    }));
    setDraft(next);
    setDirty(true);
  }
  async function importResource(file: File) {
    if (!rights.trim()) throw new Error("Renseignez les droits d’utilisation.");
    if (file.size > ARCHIVE_LIMITS.entryBytes) throw new Error("Fichier limité à 32 Mio.");
    const ext = file.name.split(".").at(-1)?.toLowerCase() ?? "";
    const types: Record<string, string> = {
      png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
      woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf",
    };
    const mimeType = types[ext];
    if (!mimeType) throw new Error("Format non pris en charge.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (mimeType.startsWith("image/")) {
      const bitmap = await createImageBitmap(new Blob([bytes], { type: mimeType }));
      bitmap.close();
    }
    const hash = await sha256(bytes);
    await store.importResource({
      id: `resource-${hash}`, path: `assets/${hash}.${ext}`, mimeType, sha256: hash,
      source: file.name, rights: rights.trim(), ...(credit.trim() ? { credit: credit.trim() } : {}),
    }, bytes);
    await refresh();
    setNotice("Ressource disponible dans le studio. Les fichiers identiques sont réutilisés avec leurs crédits et droits existants.");
  }
  async function apply() {
    if (dirty || expected === null) throw new Error("Enregistrez l’identité avant de l’appliquer.");
    const campaign = applyBrand(bundle.campaign, brand, draft.campaign.assets);
    const assets = new Map(bundle.assets);
    for (const asset of campaign.assets) {
      const original = draft.campaign.assets.find((a) => a.sha256 === asset.sha256);
      const bytes = original && draft.assets.get(original.path);
      if (bytes) assets.set(asset.path, bytes);
    }
    onApply({ campaign, assets });
    setNotice("Identité appliquée à la campagne. Enregistrez la campagne pour conserver cet instantané.");
  }
  function choices(kind: "fonts" | "logos", roles: Record<string, string>) {
    return Object.entries(roles).map(([role, label]) => {
      const ref = brand[kind]?.[role];
      const asset = draft.campaign.assets.find((a) => a.id === ref?.assetId);
      const title = `${kind === "fonts" ? "Police" : "Logo"} — ${label}`;
      return (
        <label key={role}>{title}
          <select aria-label={title} value={asset?.sha256 ?? ""}
            onChange={(e) => void run(() => assign(kind, role, e.target.value))}>
            <option value="">Non défini</option>
            {asset && !resources.some((a) => a.sha256 === asset.sha256) && (
              <option value={asset.sha256}>{asset.source} (fichier absent)</option>
            )}
            {resources.filter((a) => a.mimeType.startsWith(kind === "fonts" ? "font/" : "image/"))
              .map((a) => <option key={a.sha256} value={a.sha256}>{a.source.split("/").at(-1)}</option>)}
          </select>
        </label>
      );
    });
  }

  return (
    <main className="branding-workspace">
      <div className="branding-heading">
        <div>
          <span className="eyebrow">BRANDING / IDENTITÉ VISUELLE</span>
          <h1>Les repères de votre marque</h1>
          <p>{dirty ? "Modifications non enregistrées" : expected
            ? `Identité enregistrée · révision ${expected}` : "Identité à personnaliser"}</p>
        </div>
        <div className="actions">
          <button disabled={!ready || busy} onClick={loadSiteBrand}>Charger la charte du site</button>
          <button disabled={!ready || busy} onClick={() => void run(async () => {
            const saved = await store.saveBrand(draft, expected);
            setDraft({ ...draft, campaign: saved });
            setExpected(saved.revision);
            setDirty(false);
            setNotice("Identité enregistrée.");
          })}>Enregistrer l’identité</button>
          <button disabled={!ready || busy || dirty || expected === null}
            className="primary" onClick={() => void run(apply)}>Appliquer à la campagne</button>
        </div>
      </div>
      <div aria-live="polite">
        {error && <p role="alert" className="error">{error}</p>}
        {notice && <p role="status">{notice}</p>}
      </div>
      <fieldset disabled={!ready || busy} className="branding-fields">
        <WebsiteBrandPreset onSelect={(theme) => {
          if ((dirty || expected !== null) && !window.confirm("Remplacer le brouillon d’identité par le préréglage Flow Therapy ? L’identité enregistrée et les campagnes ne changent pas avant enregistrement et application explicites.")) return;
          void run(() => installPreset(theme));
        }} />
        <BrandSpecimen bundle={draft} />
        <div className="branding-grid">
          <section className="branding-card">
            <h2>Palette par rôle</h2>
            <label>Nom de l’identité
              <input value={brand.name} onChange={(e) => update((b) => { b.name = e.target.value; })} />
            </label>
            <BrandPalette colors={brand.colors} onChange={(role, value) => update((b) => { b.colors[role] = value; })} />
            <p>L’aperçu ci-dessus utilise cette palette. L’application graphique aux templates viendra
              avec la scène résolue. Dans le préréglage du site, Accent correspond au violet et Contraste
              à l’orange ; ces rôles deviennent indépendants après personnalisation.</p>
          </section>
          <section className="branding-card">
            <h2>Logos</h2>
            {choices("logos", logoRoles)}
            <p>PNG/JPEG. Les zones de protection et les variantes vectorielles restent à venir.</p>
          </section>
          <section className="branding-card">
            <h2>Typographies</h2>
            {choices("fonts", fontRoles)}
            <p>WOFF, WOFF2, TTF ou OTF. Les polices sont chargées dans l’aperçu de l’identité.
              Le rendu des campagnes reste provisoire.</p>
          </section>
        </div>
        <section className="branding-card resource-section">
          <div>
            <h2>Ressources du studio</h2>
            <p>Fichiers, crédits et droits communs aux identités et aux campagnes.</p>
          </div>
          <div className="resource-import">
            <label>Crédit
              <input value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="Auteur ou photographe" />
            </label>
            <label>Droits d’utilisation
              <input value={rights} onChange={(e) => setRights(e.target.value)} placeholder="Licence ou autorisation" />
            </label>
            <label>Importer une ressource
              <input type="file" accept=".png,.jpg,.jpeg,.woff,.woff2,.ttf,.otf" disabled={!rights.trim()}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void run(() => importResource(file));
                }} />
            </label>
          </div>
          <button onClick={() => void run(refresh)}>Actualiser les ressources</button>
          {resources.length ? (
            <ul className="resource-list">
              {resources.map((a) => (
                <li key={a.sha256}>
                  <strong>{a.source}</strong>
                  <span>{a.mimeType} · {a.credit || "Crédit non renseigné"}</span>
                  <details><summary>Droits d’utilisation</summary><p>{a.rights}</p></details>
                </li>
              ))}
            </ul>
          ) : <p>Aucune ressource. Importez votre premier logo, photo ou fichier de police.</p>}
        </section>
        <section className="branding-card">
          <h2>Sauvegarde de l’identité</h2>
          <div className="actions">
            <button onClick={() => void run(async () => download(await exportZIP(draft.campaign, draft.assets)))}>
              Exporter l’identité ZIP
            </button>
            <button onClick={() => {
              if (!dirty || window.confirm("Abandonner les modifications de l’identité ?")) void run(reload);
            }}>Recharger l’identité enregistrée</button>
          </div>
          <label>Importer une identité ZIP
            <input type="file" accept=".zip" onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (dirty && !window.confirm("Remplacer les modifications de l’identité ?")) return;
              void run(async () => {
                if (file.size > ARCHIVE_LIMITS.bytes) throw new Error("Archive trop volumineuse.");
                const next = await importZIP(new Uint8Array(await file.arrayBuffer()));
                if (!next.campaign.brand || next.campaign.supports.length || Object.keys(next.campaign.content).length)
                  throw new Error("Choisissez une archive d’identité exportée depuis Branding.");
                for (const a of next.campaign.assets) await store.importResource(a, next.assets.get(a.path)!);
                next.campaign.id = "studio-brand";
                setDraft(next);
                setDirty(true);
                await refresh();
                setNotice("Identité importée. Enregistrez-la pour remplacer le référentiel local.");
              });
            }} />
          </label>
          <p>Le ZIP inclut les fichiers associés à l’identité. Les autres ressources restent dans ce navigateur.</p>
        </section>
      </fieldset>
    </main>
  );
}
