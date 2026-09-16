/** Build the PROTO-01 campaign from pinned Flow Therapy assets. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { exportZIP, sha256 } from "../src/storage/archive.ts";

const root = new URL("../", import.meta.url);
const output = new URL("public/prototypes/", root);
const sourceRepository = "falcoer/flowtherapy-bio-website";
const sourceCommit = "883712401d1a3cdf8961dede819b8ec8cbd7195d";
const rights = "Usage Flow Therapy uniquement. Source interne au projet Flow Therapy.";

const resources = [
  { id: "proto:hero", path: "assets/prototype/live-blue.JPG", mimeType: "image/jpeg", sourcePath: "assets-src/medias/52e253fa-e8ee-477a-a27b-cfa4db0f661d.JPG", hash: "22267c86f96a69156c4f9c3cce54a8eaa06fa40b5ffec5d0b00ff0f390f0fc8b" },
  { id: "proto:alpaca-1", path: "assets/prototype/alpaga1.png", mimeType: "image/png", sourcePath: "assets-src/images/alpaga1-nu.png", hash: "51ec2fe21a6a662649d109dc1fa4171550710654fa36fd64fa1b0900fa6a4fdb" },
  { id: "proto:alpaca-2", path: "assets/prototype/alpaga2.png", mimeType: "image/png", sourcePath: "assets-src/images/alpaga2-nu.png", hash: "6b54dcd9f26bb301636ab6b13a8be3149f197f0c89d4b16a758a61b41a62967f" },
  { id: "proto:alpaca-3", path: "assets/prototype/alpaga3.png", mimeType: "image/png", sourcePath: "assets-src/images/alpaga3-nu.png", hash: "70782f77738a9caab8af66fe2095c295c21f65c493058efda188da6fb128b425" },
];

const json = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const template = await json("catalog/templates/concert-illustrated.json");
const base = await json("examples/campaign-demo.json");
const formats = Object.fromEntries(await Promise.all(["square", "story", "a4"].map(async (id) => [id, await json(`catalog/formats/${id}.json`)])));

async function download(resource) {
  const url = `https://raw.githubusercontent.com/${sourceRepository}/${sourceCommit}/${resource.sourcePath}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Prototype asset unavailable (${response.status}): ${resource.sourcePath}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== resource.hash) throw new Error(`Prototype asset SHA-256 mismatch: ${resource.sourcePath}`);
  return bytes;
}

const assets = new Map();
const assetMetadata = [];
for (const resource of resources) {
  const bytes = await download(resource);
  assets.set(resource.path, bytes);
  assetMetadata.push({
    id: resource.id,
    path: resource.path,
    mimeType: resource.mimeType,
    sha256: await sha256(bytes),
    source: `https://github.com/${sourceRepository}/blob/${sourceCommit}/${resource.sourcePath}`,
    rights,
  });
}

const campaign = structuredClone(base);
campaign.id = "prototype:flowtherapy-viability";
campaign.revision = 1;
campaign.name = "PROTO-01 — Flow Therapy viability";
campaign.locale = "fr-FR";
campaign.creativeDirection = {
  directionVersion: 1,
  energy: 82,
  colorExpression: 78,
  scale: 72,
  density: 58,
  dominant: "balanced",
  harmony: "petrol",
  imageAssetId: "proto:hero",
};
campaign.content = {
  title: "FLOW THERAPY",
  kicker: "MUSIQUE · ÉNERGIE · ÉMOTION",
  events: [
    { id: "proto:event-1", date: "2026-10-24", label: "Les Insolites", location: "Martigues" },
    { id: "proto:event-2", date: "2026-11-14", label: "Concert prototype", location: "Bouches-du-Rhône" },
    { id: "proto:event-3", date: "2026-12-05", label: "Concert prototype", location: "Bouches-du-Rhône" },
  ],
  heroImage: { assetId: "proto:hero" },
  alpacaLeft: { assetId: "proto:alpaca-1" },
  alpacaCenter: { assetId: "proto:alpaca-2" },
  alpacaRight: { assetId: "proto:alpaca-3" },
};
campaign.assets = assetMetadata;
campaign.supports = [{
  id: "prototype:concert-poster",
  name: "Affiche concert — prototype",
  template,
  bindings: {
    title: "title",
    kicker: "kicker",
    events: "events",
    heroImage: "heroImage",
    alpacaLeft: "alpacaLeft",
    alpacaCenter: "alpacaCenter",
    alpacaRight: "alpacaRight",
  },
  overrides: {},
  eventSelections: { events: { mode: "all" } },
  variants: ["square", "story", "a4"].map((layoutId) => ({
    id: `prototype:${layoutId}`,
    layoutId,
    format: formats[layoutId],
    placementOverrides: {},
  })),
}];

await mkdir(output, { recursive: true });
const archive = await exportZIP(campaign, assets);
await writeFile(new URL("flowtherapy-viability.zip", output), archive);
await writeFile(new URL("flowtherapy-viability.json", output), JSON.stringify(campaign, null, 2));
console.log(`PROTO-01: ${campaign.content.events.length} événements, ${campaign.assets.length} assets réels, ${campaign.supports[0].variants.length} formats, ${archive.length} octets.`);
