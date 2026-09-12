import type { Asset, EditorialDocument } from "../domain/model.js";
import { exportJSON } from "./json.js";
import { includeEditorial } from "../domain/editorial.js";
import { validateEditorial } from "../domain/core.js";
import { exportZIP, importZIP, ARCHIVE_LIMITS } from "./archive.js";
import type { CampaignBundle } from "./indexeddb.js";
import { IndexedDBCampaignStore } from "./indexeddb.js";

/** Load all binaries before returning; a failed selection never alters the campaign. */
export async function selectEditorial(
  bundle: CampaignBundle,
  document: EditorialDocument,
  store: IndexedDBCampaignStore,
): Promise<CampaignBundle> {
  const source = structuredClone(document),
    campaign = includeEditorial(bundle.campaign, source);
  const assets = new Map(bundle.assets);
  const resources = await Promise.all(
    source.assets.map((a) => store.loadResource(a.sha256)),
  );
  for (const { asset, bytes } of resources) {
    const target = campaign.assets.find((a) => a.sha256 === asset.sha256)!;
    assets.set(target.path, bytes);
  }
  exportJSON(campaign);
  return { campaign, assets };
}
export async function resourceBundle(
  store: IndexedDBCampaignStore,
  assets: Asset[],
): Promise<CampaignBundle> {
  const selected = structuredClone(assets),
    files = new Map<string, Uint8Array>();
  // Sequential retrieval bounds transient memory for large catalogues.
  let size = 0;
  for (const a of selected) {
    const { bytes } = await store.loadResource(a.sha256);
    size += bytes.byteLength;
    if (size > ARCHIVE_LIMITS.bytes)
      throw new Error("Catalogue trop volumineux pour une archive unique.");
    files.set(a.path, bytes);
  }
  return {
    campaign: {
      schemaVersion: 3,
      id: "editorial-backup",
      revision: 1,
      name: "Sauvegarde éditoriale",
      locale: "fr-FR",
      content: {},
      supports: [],
      assets: selected,
    },
    assets: files,
  };
}
export async function exportEditorial(
  document: EditorialDocument,
  store: IndexedDBCampaignStore,
): Promise<Uint8Array> {
  const copy = structuredClone(document);
  validateEditorial(copy);
  const bundle = await resourceBundle(store, copy.assets);
  bundle.campaign.editorial = [copy];
  return exportZIP(bundle.campaign, bundle.assets);
}
export async function restoreEditorial(
  bytes: Uint8Array,
  store: IndexedDBCampaignStore,
  newId: string,
): Promise<EditorialDocument> {
  const bundle = await importZIP(bytes);
  if (
    bundle.campaign.editorial?.length !== 1 ||
    bundle.campaign.supports.length
  )
    throw new Error(
      "Choisissez une sauvegarde ZIP d’un seul contenu éditorial.",
    );
  const document = structuredClone(bundle.campaign.editorial[0]);
  document.id = newId;
  document.revision = 1;
  document.assets = await Promise.all(
    document.assets.map((a) =>
      store.importResource(a, bundle.assets.get(a.path)!),
    ),
  );
  validateEditorial(document);
  return store.saveEditorial(document, null);
}
