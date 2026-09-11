/** Pin and verify upstream sources at build time; browsers only load local ZIPs. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { websiteBrand, createWebsiteBrandCampaign } from "../src/domain/website-brand.ts";
import { ARCHIVE_LIMITS, exportZIP } from "../src/storage/archive.ts";

const root = new URL("../", import.meta.url);
const cache = new URL(".cache/website-branding/", root);
const output = new URL("public/branding/flowtherapy-website/", root);
const { repository, commit } = websiteBrand.source;
if (!/^[\w-]+\/[\w.-]+$/.test(repository) || !/^[a-f0-9]{40}$/.test(commit))
  throw new Error("La source du branding doit être un dépôt et un commit complets.");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const gitBlob = (bytes) => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
await mkdir(cache, { recursive: true });
await mkdir(output, { recursive: true });
async function source(path, hash, digest = sha256) {
  if (!/^[\w./-]+$/.test(path) || path.split("/").includes("..")) throw new Error("Chemin source invalide.");
  const file = new URL(hash, cache);
  try {
    const bytes = await readFile(file);
    if (digest(bytes) === hash) return bytes;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const response = await fetch(`https://raw.githubusercontent.com/${repository}/${commit}/${path}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Source branding indisponible (${response.status}) : ${path}`);
  if (Number(response.headers.get("content-length")) > ARCHIVE_LIMITS.entryBytes)
    throw new Error(`Source branding trop volumineuse : ${path}`);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > ARCHIVE_LIMITS.entryBytes) {
      await reader.cancel();
      throw new Error(`Source branding trop volumineuse : ${path}`);
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks);
  if (digest(bytes) !== hash) throw new Error(`Empreinte source branding incorrecte : ${path}`);
  await writeFile(file, bytes);
  return bytes;
}
const assets = [], binaries = new Map();
for (const resource of websiteBrand.resources) {
  const input = await source(resource.sourcePath, resource.sourceSha256);
  const bytes = resource.compression === "gzip"
    ? gunzipSync(input, { maxOutputLength: ARCHIVE_LIMITS.entryBytes }) : input;
  let rights = "Usage Flow Therapy uniquement. Aucune licence de redistribution tierce déclarée dans le dépôt source.";
  if (resource.licensePath) {
    const license = await source(resource.licensePath, resource.licenseGitBlob, gitBlob);
    rights = license.toString("utf8");
    // Preserve the entire licence and copyright in campaign.json inside each ZIP.
  }
  assets.push({
    id: resource.id, path: resource.path, mimeType: resource.mimeType,
    sha256: sha256(bytes),
    source: `https://github.com/${repository}/blob/${commit}/${resource.sourcePath}`,
    rights,
  });
  binaries.set(resource.path, new Uint8Array(bytes));
}
for (const theme of ["light", "dark"]) {
  const campaign = createWebsiteBrandCampaign(theme, assets);
  const archive = await exportZIP(campaign, binaries);
  await writeFile(new URL(`${theme}.zip`, output), archive);
  console.log(`Branding Flow Therapy ${theme} : ${assets.length} ressources vérifiées, ${archive.length} octets.`);
}
