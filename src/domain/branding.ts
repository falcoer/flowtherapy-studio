import type { Asset, Brand, Campaign } from "./model.js";
import { validateCampaign } from "./core.js";

/** Resource metadata is snapshotted; a collision never overwrites existing content. */
export function attachResource(campaign: Campaign, asset: Asset): string {
  const same = campaign.assets.find(
    (a) => a.sha256 === asset.sha256 && a.mimeType === asset.mimeType,
  );
  if (same) return same.id;
  if (campaign.assets.some((a) => a.id === asset.id || a.path === asset.path))
    throw new Error(
      "Identifiant ou chemin de ressource déjà utilisé par un autre fichier.",
    );
  campaign.assets.push(structuredClone(asset));
  return asset.id;
}
export function applyBrand(
  campaign: Campaign,
  brand: Brand,
  resources: Asset[],
): Campaign {
  const next = structuredClone(campaign),
    snapshot = structuredClone(brand);
  for (const roles of [snapshot.fonts, snapshot.logos ?? {}]) {
    for (const ref of Object.values(roles)) {
      const asset = resources.find((a) => a.id === ref.assetId);
      if (!asset) throw new Error("Ressource de marque introuvable.");
      ref.assetId = attachResource(next, asset);
    }
  }
  next.brand = snapshot;
  // Explicit application also updates the exact brand revision requested by supports.
  for (const support of next.supports) {
    if (support.template.brandRef?.id === snapshot.id)
      support.template.brandRef = {
        id: snapshot.id,
        revision: snapshot.revision,
      };
  }
  validateCampaign(next);
  return next;
}
