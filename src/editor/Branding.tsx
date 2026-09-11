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
import {
  flowTherapySiteBrand,
  flowTherapySiteFontAssets,
  flowTherapySiteFonts,
} from "./siteBrand.js";

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
const siteFontRights = "SIL Open Font License 1.1";
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
  async function persistResource(input: {
    bytes: Uint8Array;
    fileName: string;
    mimeType: string;
    source?: string;
    rights: string;
    credit?: string;
  }) {
    const hash = await sha256(input.bytes);
    const asset = await store.importResource(
      {
        id: `resource-${hash}`,
        path: `assets/${hash}.${input.fileName.split(".").at(-1)?.toLowerCase() ?? "bin"}`,
        mimeType: input.mimeType,
        sha256: hash,
        source: input.source ?? input.fileName,
        rights: input.rights,
        ...(input.credit ? { credit: input.credit } : {}),
      },
      input.bytes,
    );
    return { asset, bytes: input.bytes };
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
    await persistResource({
      bytes,
      fileName: file.name,
      mimeType,
      rights: rights.trim(),
      credit: credit.trim() || undefined,
    });
    await refresh();
    setNotice(
      "Ressource disponible dans le studio. Les fichiers identiques sont réutilisés avec leurs crédits et droits existants.",
    );
  }
  async function importSiteFonts() {
    const imported = await Promise.all(
      flowTherapySiteFontAssets.map(async (font) => {
        const response = await fetch(font.sourcePath);
        if (!response.ok) throw new Error(`Police inaccessible : ${font.fileName}.`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        return { font, ...(await persistResource({
          bytes,
          fileName: font.fileName,
          mimeType: "font/ttf",
          source: font.fileName,
          rights: siteFontRights,
          credit: `Google Fonts · ${font.source}`,
        })) };
      }),
    );
    const next = structuredClone(draft);
    for (const { font, asset, bytes } of imported) {
      const assetId = attachResource(next.campaign, asset);
      next.assets.set(asset.path, bytes);
      if (!next.campaign.brand!.fonts[font.role] && font.id !== "kalam-bold") {
        next.campaign.brand!.fonts[font.role] = { assetId };
      }
    }
    setDraft(next);
    setDirty(true);
    await refresh();
    setNotice(
      "Les polices du site ont été importées et associées aux rôles disponibles. Enregistrez l’identité pour les conserver.",
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
  const fontSignature = Object.values(brand.fonts)
    .map((ref) => ref.assetId)
    .sort()
    .join("|");
  const [loadedFontFamilies, setLoadedFontFamilies] = useState<
    Record<string, string>
  >({});
  useEffect(() => {
    let active = true;
    const faces: FontFace[] = [];
    const fontSet = document.fonts as FontFaceSet & {
      add(face: FontFace): void;
      delete(face: FontFace): boolean;
    };
    const load = async () => {
      const families: Record<string, string> = {};
      const selected = new Map(
        Object.values(brand.fonts).map((ref) => {
          const asset = draft.campaign.assets.find((a) => a.id === ref.assetId);
          return [asset?.sha256 ?? "", asset] as const;
        }),
      );
      for (const [hash, asset] of selected) {
        if (!hash || !asset) continue;
        const bytes = draft.assets.get(asset.path);
        if (!bytes) continue;
        const family = `FTAsset-${hash.slice(0, 12)}`;
        const face = new FontFace(family, new Uint8Array(bytes).buffer);
        try {
          await face.load();
          if (!active) return;
          fontSet.add(face);
          faces.push(face);
          families[hash] = family;
        } catch {
          // The archive signature is checked at import; a browser may still
          // reject an otherwise valid font and the system fallback is enough.
        }
      }
      if (active) setLoadedFontFamilies(families);
    };
    void load();
    return () => {
      active = false;
      for (const face of faces) fontSet.delete(face);
    };
  }, [draft.assets, draft.campaign.assets, fontSignature, brand.fonts]);
  function fontFamily(asset?: Asset) {
    if (!asset) return undefined;
    return (
      loadedFontFamilies[asset.sha256] ??
      (asset.source.toLowerCase().includes("bangers")
        ? "Bangers"
        : asset.source.toLowerCase().includes("kalam")
          ? "Kalam"
          : asset.source.toLowerCase().includes("inter")
            ? "Inter"
            : undefined)
    );
  }
  function choices(kind: "fonts" | "logos", roles: Record<string, string>) {
    return Object.entries(roles).map(([role, label]) => {
      const ref = brand[kind]?.[role],
        asset = draft.campaign.assets.find((a) => a.id === ref?.assetId);
      const sample =
        role === "title"
          ? "FLOW THERAPY"
          : role === "caption"
            ? "Une note vivante"
            : "Musique · Énergie · Émotion";
      return (
        <div className="font-choice" key={role}>
          <label>
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
          {kind === "fonts" && (
            <div
              className="font-specimen"
              style={{ fontFamily: fontFamily(asset) ?? "inherit" }}
            >
              {sample}
            </div>
          )}
        </div>
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
                        aria-label={role === "accent" || role === "contrast" ? label : `${group.label} — ${label}`}
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
            <div className="font-tools">
              <button type="button" onClick={() => void run(importSiteFonts)}>
                Importer les polices du site
              </button>
              <span>
                Bangers, Inter variable et Kalam depuis le dépôt Flow Therapy
              </span>
            </div>
            {choices("fonts", fontRoles)}
            <p>
              Références du site : titres — {flowTherapySiteFonts.title}, corps
              — {flowTherapySiteFonts.body}, annotations — {flowTherapySiteFonts.caption}.
              Le bouton ci-dessus importe les fichiers maîtres et les associe
              automatiquement aux rôles encore libres. Vous pouvez ensuite
              choisir une autre police dans chaque sélecteur.
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
            <p className="storage-note">
              Les fichiers importés restent dans le stockage local du
              navigateur : les métadonnées sont indexées par empreinte SHA-256
              et les octets sont conservés séparément. Un export ZIP permet de
              les transférer ou de les sauvegarder.
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
