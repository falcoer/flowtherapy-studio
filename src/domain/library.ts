import type { Asset, Campaign, EditorialDocument } from "./model.js";
import type { BrandConfiguration, JsonValue } from "./brand-configuration.js";

export type LibraryUsageKind = "brand" | "campaign" | "editorial";
export interface LibraryUsage {
  id: string;
  kind: LibraryUsageKind;
  consumerId: string;
  label: string;
  role?: string;
  snapshot: boolean;
  releaseVersion?: number;
}
export interface LibraryEntry {
  asset: Asset;
  kind: "image" | "font" | "other";
  usages: LibraryUsage[];
}

function kindOf(asset: Asset): LibraryEntry["kind"] {
  if (asset.mimeType.startsWith("image/")) return "image";
  if (asset.mimeType.startsWith("font/")) return "font";
  return "other";
}
function assetId(value: JsonValue): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return typeof value.assetId === "string" ? value.assetId : undefined;
}
function uniqueUsages(usages: LibraryUsage[]) {
  const seen = new Set<string>();
  return usages.filter((usage) => {
    if (seen.has(usage.id)) return false;
    seen.add(usage.id);
    return true;
  });
}

/**
 * Builds a read-only projection over the existing content-addressed resource store.
 * No file or metadata is copied: snapshots are matched back to canonical resources
 * by SHA-256, while Brand Configuration references are resolved by stable asset id.
 */
export function buildLibraryIndex(
  resources: Asset[],
  campaigns: Campaign[],
  editorial: EditorialDocument[],
  brandConfiguration?: BrandConfiguration | null,
): LibraryEntry[] {
  const entries = new Map<string, LibraryEntry>();
  for (const asset of resources) {
    const existing = entries.get(asset.sha256);
    if (existing) continue;
    entries.set(asset.sha256, {
      asset: structuredClone(asset),
      kind: kindOf(asset),
      usages: [],
    });
  }
  const byId = new Map<string, LibraryEntry>();
  for (const entry of entries.values()) byId.set(entry.asset.id, entry);

  const addBySnapshot = (asset: Asset, usage: LibraryUsage) => {
    const entry = entries.get(asset.sha256);
    if (entry) entry.usages.push(usage);
  };
  const addById = (id: string, usage: LibraryUsage) => {
    byId.get(id)?.usages.push(usage);
  };

  for (const campaign of campaigns) {
    for (const asset of campaign.assets) {
      addBySnapshot(asset, {
        id: `campaign:${campaign.id}:asset:${asset.sha256}`,
        kind: "campaign",
        consumerId: campaign.id,
        label: campaign.name || "Campagne sans titre",
        snapshot: true,
      });
    }
    if (campaign.brand) {
      for (const [role, ref] of Object.entries(campaign.brand.fonts)) {
        const asset = campaign.assets.find((candidate) => candidate.id === ref.assetId);
        if (asset)
          addBySnapshot(asset, {
            id: `campaign:${campaign.id}:brand:font:${role}:${asset.sha256}`,
            kind: "campaign",
            consumerId: campaign.id,
            label: campaign.name || "Campagne sans titre",
            role: `Police de marque · ${role}`,
            snapshot: true,
          });
      }
      for (const [role, ref] of Object.entries(campaign.brand.logos ?? {})) {
        const asset = campaign.assets.find((candidate) => candidate.id === ref.assetId);
        if (asset)
          addBySnapshot(asset, {
            id: `campaign:${campaign.id}:brand:logo:${role}:${asset.sha256}`,
            kind: "campaign",
            consumerId: campaign.id,
            label: campaign.name || "Campagne sans titre",
            role: `Logo de marque · ${role}`,
            snapshot: true,
          });
      }
    }
  }

  for (const document of editorial) {
    for (const asset of document.assets) {
      addBySnapshot(asset, {
        id: `editorial:${document.id}:asset:${asset.sha256}`,
        kind: "editorial",
        consumerId: document.id,
        label: document.title || "Contenu sans titre",
        role: document.kind,
        snapshot: true,
      });
    }
  }

  for (const release of brandConfiguration?.releases ?? []) {
    for (const object of release.objects) {
      if (object.type !== "font-role" && object.type !== "logo") continue;
      const id = assetId(object.value);
      if (!id) continue;
      addById(id, {
        id: `brand:${release.id}:${object.id}:${id}`,
        kind: "brand",
        consumerId: release.id,
        label: `Release ${release.version}`,
        role:
          object.type === "font-role"
            ? `Police · ${object.role}`
            : `Logo · ${object.role}`,
        snapshot: true,
        releaseVersion: release.version,
      });
    }
  }

  return [...entries.values()]
    .map((entry) => ({
      ...entry,
      usages: uniqueUsages(entry.usages).sort((a, b) =>
        `${a.kind}:${a.label}:${a.role ?? ""}`.localeCompare(
          `${b.kind}:${b.label}:${b.role ?? ""}`,
          "fr",
        ),
      ),
    }))
    .sort((a, b) => a.asset.source.localeCompare(b.asset.source, "fr"));
}
