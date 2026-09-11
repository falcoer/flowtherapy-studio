import type { WebsiteBrandTheme } from "../domain/website-brand.js";
import { websiteBrand } from "../domain/website-brand.js";
import { ARCHIVE_LIMITS, importZIP } from "./archive.js";
import type { CampaignBundle } from "./indexeddb.js";

/** Local static catalogue, not a runtime call to GitHub or the public website. */
export async function loadWebsiteBrandPreset(
  theme: WebsiteBrandTheme,
  baseURL: string,
): Promise<CampaignBundle> {
  if (theme !== "light" && theme !== "dark") throw new Error("Palette Flow Therapy inconnue.");
  const url = new URL(`branding/flowtherapy-website/${theme}.zip`, baseURL);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Préréglage Flow Therapy indisponible (${response.status}).`);
  if (Number(response.headers.get("content-length")) > ARCHIVE_LIMITS.bytes)
    throw new Error("Préréglage trop volumineux.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > ARCHIVE_LIMITS.bytes) throw new Error("Préréglage trop volumineux.");
  const bundle = await importZIP(bytes);
  const { campaign } = bundle;
  if (campaign.id !== "studio-brand" || campaign.brand?.id !== websiteBrand.id ||
      campaign.supports.length || Object.keys(campaign.content).length ||
      campaign.brand.tags?.includes(theme) !== true)
    throw new Error("Le fichier reçu n’est pas le préréglage Flow Therapy demandé.");
  return bundle;
}
