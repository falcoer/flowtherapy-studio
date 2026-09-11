import { useEffect, useRef, useState } from "react";
import type { Asset, Brand } from "../domain/model.js";
import { applyBrand, attachResource } from "../domain/branding.js";
import { IndexedDBCampaignStore } from "../storage/indexeddb.js";
import type { CampaignBundle } from "../storage/indexeddb.js";
import {
  ARCHIVE_LIMITS,
  exportZIP,
  importZIP,
  sha256,
} from "../storage/archive.js";
import "./branding.css";
import { flowTherapySiteBrand, flowTherapySiteFonts } from "./siteBrand.js";

const colorGroups = [
  {
    label: "Thème clair",
    roles: {
      background: "Fond",
      surface: "Surface",
      text: "Texte",
      muted: "Texte secondaire",
      accent: "Accent",
      contrast: "Contraste",
      purple: "Violet",
      orange: "Orange",
      pink: "Rose",
      blue: "Bleu",
    },
  },
  {
    label: "Thème sombre",
    roles: {
      darkBackground: "Fond",
      darkSurface: "Surface",
      darkText: "Texte",
      darkMuted: "Texte secondaire",
      darkPurple: "Violet",
      darkOrange: "Orange",
      darkPink: "Rose",
      darkBlue: "Bleu",
    },
  },
];
const fontRoles = { title: "Titres", body: "Corps", caption: "Légendes" };
const logoRoles = {
  primary: "Principal",
  light: "Sur fond clair",
  dark: "Sur fond sombre",
};
function initial(): CampaignBundle {
  return {
    campaign: {
      schemaVersion: 2,
      id: "studio-brand",
      revision: 1,
      name: "Identité du studio",
      locale: "fr-FR",
      content: {},
      supports: [],
      assets: [],
      brand: {
        schemaVersion: 2,
        id: "local:studio-brand",
        revision: 1,
        ...flowTherapySiteBrand,
        fonts: {},

        logos: {},
      },
    },
    assets: new Map(),
  };
}
function download(bytes: Uint8Array) {
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], { type: "application/zip" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "branding.zip";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Branding({
  bundle,
  onApply,
}: {
  bundle: CampaignBundle;
  onApply: (next: CampaignBundle) => void;
}) {
  const [store] = useState(() => new IndexedDBCampaignStore());
  const [draft, setDraft] = useState(initial);
  const [expected, setExpected] = useState<number | null>(null);
  const [resources, setResources] = useState<Asset[]>([]);
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [credit, setCredit] = useState(""),
    [rights, setRights] = useState("");
  const brand = draft.campaign.brand!;
  async function refresh() {
    setResources(await store.listResources());
  }
  async function reload() {
    const saved = await store.loadBrand();
    if (saved) {
      setDraft(saved);
      setExpected(saved.campaign.revision);
    } else {
      setDraft(initial());
      setExpected(null);
    }
    await refresh();
    setDirty(false);
    setReady(true);
  }
  useEffect(() => {
    void reload().catch((e) => setError(String(e)));
    return () => {
      void store.close().catch(() => {});
    };
  }, [store]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
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
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function update(fn: (brand: Brand) => void) {
    const next = structuredClone(draft);
    fn(next.campaign.brand!);
    setDraft(next);
    setDirty(true);
    setNotice("");
  }
  function loadSiteBrand() {
    update((b) => {
      b.name = flowTherapySiteBrand.name;
      b.description = flowTherapySiteBrand.description;
      b.tags = [...(flowTherapySiteBrand.tags ?? [])];
      b.colors = { ...flowTherapySiteBrand.colors };
    });
    setNotice(
      "Charte Flow Therapy chargée depuis la configuration du site. Importez ensuite les logos et polices autorisés.",
    );
  }

  async function assign(kind: "fonts" | "logos", role: string, hash: string) {
    const next = structuredClone(draft),
      roles = (next.campaign.brand![kind] ??= {});
    if (!hash) delete roles[role];
    else {
      const { asset, bytes } = await store.loadResource(hash);
      const assetId = attachResource(next.campaign, asset);
      const target = next.campaign.assets.find((a) => a.id === assetId)!;
      next.assets.set(target.path, bytes);
      roles[role] = { assetId };
    }
    const used = new Set(
      [
        ...Object.values(next.campaign.brand!.fonts),
        ...Object.values(next.campaign.brand!.logos ?? {}),
      ].map((r) => r.assetId),
    );
    next.campaign.assets = next.campaign.assets.filter((a) => used.has(a.id));
    next.assets = new Map(
      next.campaign.assets.flatMap((a) => {
        const bytes = next.assets.get(a.path);
        return bytes ? [[a.path, bytes] as const] : [];
      }),
    );
    setDraft(next);
    setDirty(true);
  }
  async function importResource(file: File) {
    if (!rights.trim()) throw new Error("Renseignez les droits d’utilisation.");
    if (file.size > ARCHIVE_LIMITS.entryBytes)
      throw new Error("Fichier limité à 32 Mio.");
    const ext = file.name.split(".").at(-1)?.toLowerCase() ?? "";
    const types: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      woff: "font/woff",
      woff2: "font/woff2",
      ttf: "font/ttf",
      otf: "font/otf",
    };
    const mimeType = types[ext];
    if (!mimeType) throw new Error("Format non pris en charge.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (mimeType.startsWith("image/")) {
      const bitmap = await createImageBitmap(
        new Blob([bytes], { type: mimeType }),
      );
      bitmap.close();
    }
    const hash = await sha256(bytes);
    await store.importResource(
      {
        id: `resource-${hash}`,
        path: `assets/${hash}.${ext}`,
        mimeType,
        sha256: hash,
        source: file.name,
        rights: rights.trim(),
        ...(credit.trim() ? { credit: credit.trim() } : {}),
      },
      bytes,
    );
    await refresh();
    setNotice(
      "Ressource disponible dans le studio. Les fichiers identiques sont réutilisés avec leurs crédits et droits existants.",
    );
  }
  async function apply() {
    if (dirty || expected === null)
      throw new Error("Enregistrez l’identité avant de l’appliquer.");
    const campaign = applyBrand(bundle.campaign, brand, draft.campaign.assets);
    const assets = new Map(bundle.assets);
    for (const asset of campaign.assets) {
      const original = draft.campaign.assets.find(
        (a) => a.sha256 === asset.sha256,
      );
      const bytes = original && draft.assets.get(original.path);
      if (bytes) assets.set(asset.path, bytes);
    }
    onApply({ campaign, assets });
    setNotice(
      "Identité appliquée à la campagne. Enregistrez la campagne pour conserver cet instantané.",
    );
  }
  function choices(kind: "fonts" | "logos", roles: Record<string, string>) {
    return Object.entries(roles).map(([role, label]) => {
      const ref = brand[kind]?.[role],
        asset = draft.campaign.assets.find((a) => a.id === ref?.assetId);
      return (
        <label key={role}>
          {kind === "fonts" ? "Police" : "Logo"} — {label}
          <select
            aria-label={`${kind === "fonts" ? "Police" : "Logo"} — ${label}`}
            value={asset?.sha256 ?? ""}
            onChange={(e) => void run(() => assign(kind, role, e.target.value))}
          >
            <option value="">Non défini</option>
            {asset && !resources.some((a) => a.sha256 === asset.sha256) && (
              <option value={asset.sha256}>
                {asset.source} (fichier absent)
              </option>
            )}
            {resources
              .filter((a) =>
                a.mimeType.startsWith(kind === "fonts" ? "font/" : "image/"),
              )
              .map((a) => (
                <option key={a.sha256} value={a.sha256}>
                  {a.source}
                </option>
              ))}
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
          <p>
            {dirty
              ? "Modifications non enregistrées"
              : expected
                ? `Identité enregistrée · révision ${expected}`
                : "Identité à personnaliser"}
          </p>
        </div>
        <div className="actions">
          <button
            disabled={!ready || busy}
            onClick={loadSiteBrand}
          >
            Charger la charte du site
          </button>
          <button
            disabled={!ready || busy}
            onClick={() =>
              void run(async () => {
                const saved = await store.saveBrand(draft, expected);
                setDraft({ ...draft, campaign: saved });
                setExpected(saved.revision);
                setDirty(false);
                setNotice("Identité enregistrée.");
              })
            }
          >
            Enregistrer l’identité
          </button>
          <button
            disabled={!ready || busy || dirty || expected === null}
            className="primary"
            onClick={() => void run(apply)}
          >
            Appliquer à la campagne
          </button>
        </div>
      </div>
      <div aria-live="polite">
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
      </div>
      <fieldset disabled={!ready || busy} className="branding-fields">
        <div className="branding-grid">
          <section className="branding-card">
            <h2>Palette par rôle</h2>
            <label>
              Nom de l’identité
              <input
                value={brand.name}
                onChange={(e) =>
                  update((b) => {
                    b.name = e.target.value;
                  })
                }
              />
            </label>
            {colorGroups.map((group) => (
              <div className="branding-color-group" key={group.label}>
                <h3>{group.label}</h3>
                <div className="branding-swatches">
                  {Object.entries(group.roles).map(([role, label]) => (
                    <label key={role}>
                      {label}
                      <input
                        type="color"
                        aria-label={`${group.label} — ${label}`}
                        value={brand.colors[role] ?? "#000000"}
                        onChange={(e) =>
                          update((b) => {
                            b.colors[role] = e.target.value;
                          })
                        }
                      />
                      <span>{brand.colors[role] ?? "Non défini"}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <p>
              Ces couleurs forment le référentiel. Leur application graphique
              aux templates viendra avec la scène résolue.
            </p>
          </section>
          <section className="branding-card">
            <h2>Logos</h2>
            {choices("logos", logoRoles)}
            <p>
              PNG/JPEG. Les zones de protection et les variantes vectorielles
              restent à venir.
            </p>
          </section>
          <section className="branding-card">
            <h2>Typographies</h2>
            {choices("fonts", fontRoles)}
            <p>
              Références du site : titres — {flowTherapySiteFonts.title}, corps
              — {flowTherapySiteFonts.body}, annotations — {flowTherapySiteFonts.caption}.
              Importez les fichiers WOFF/WOFF2/TTF/OTF pour les associer aux rôles ;
              les aperçus utilisent encore les polices système.
            </p>
          </section>
        </div>
        <section className="branding-card resource-section">
          <div>
            <h2>Ressources du studio</h2>
            <p>
              Fichiers, crédits et droits communs aux identités et aux
              campagnes.
            </p>
          </div>
          <div className="resource-import">
            <label>
              Crédit
              <input
                value={credit}
                onChange={(e) => setCredit(e.target.value)}
                placeholder="Auteur ou photographe"
              />
            </label>
            <label>
              Droits d’utilisation
              <input
                value={rights}
                onChange={(e) => setRights(e.target.value)}
                placeholder="Licence ou autorisation"
              />
            </label>
            <label>
              Importer une ressource
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.woff,.woff2,.ttf,.otf"
                disabled={!rights.trim()}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void run(() => importResource(file));
                }}
              />
            </label>
          </div>
          <button onClick={() => void run(refresh)}>
            Actualiser les ressources
          </button>
          {resources.length ? (
            <ul className="resource-list">
              {resources.map((a) => (
                <li key={a.sha256}>
                  <strong>{a.source}</strong>
                  <span>
                    {a.mimeType} · {a.credit || "Crédit non renseigné"}
                  </span>
                  <span>{a.rights}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              Aucune ressource. Importez votre premier logo, photo ou fichier de
              police.
            </p>
          )}
        </section>
        <section className="branding-card">
          <h2>Sauvegarde de l’identité</h2>
          <div className="actions">
            <button
              onClick={() =>
                void run(async () =>
                  download(await exportZIP(draft.campaign, draft.assets)),
                )
              }
            >
              Exporter l’identité ZIP
            </button>
            <button
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm("Abandonner les modifications de l’identité ?")
                )
                  void run(reload);
              }}
            >
              Recharger l’identité enregistrée
            </button>
          </div>
          <label>
            Importer une identité ZIP
            <input
              type="file"
              accept=".zip"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (
                  dirty &&
                  !window.confirm("Remplacer les modifications de l’identité ?")
                )
                  return;
                void run(async () => {
                  if (file.size > ARCHIVE_LIMITS.bytes)
                    throw new Error("Archive trop volumineuse.");
                  const next = await importZIP(
                    new Uint8Array(await file.arrayBuffer()),
                  );
                  if (
                    !next.campaign.brand ||
                    next.campaign.supports.length ||
                    Object.keys(next.campaign.content).length
                  )
                    throw new Error(
                      "Choisissez une archive d’identité exportée depuis Branding.",
                    );
                  for (const a of next.campaign.assets)
                    await store.importResource(a, next.assets.get(a.path)!);
                  next.campaign.id = "studio-brand";
                  setDraft(next);
                  setDirty(true);
                  await refresh();
                  setNotice(
                    "Identité importée. Enregistrez-la pour remplacer le référentiel local.",
                  );
                });
              }}
            />
          </label>
          <p>
            Le ZIP inclut les fichiers associés à l’identité. Les autres
            ressources restent dans ce navigateur.
          </p>
        </section>
      </fieldset>
    </main>
  );
}
