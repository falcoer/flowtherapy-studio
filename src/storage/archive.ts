import { zipSync } from 'fflate';
import { requireThat, safeAssetPath, validateStructure } from '../domain/core.js';
import type { ArchiveManifest, Asset, Campaign } from '../domain/model.js';
import { exportJSON, importJSON, MAX_JSON_BYTES, parseJSON } from './json.js';

export const ARCHIVE_LIMITS = Object.freeze({ bytes: 64 * 1024 * 1024, entryBytes: 32 * 1024 * 1024, entries: 256 });
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
export async function sha256(bytes: Uint8Array): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))), b => b.toString(16).padStart(2, '0')).join('');
}
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) { crc ^= byte; for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
const validPath = (path: string) => path === 'campaign.json' || path === 'manifest.json' || safeAssetPath(path);
/** v1 accepts STORE only. Validate central/local metadata before copying any payload. */
function readZip(bytes: Uint8Array): Map<string, Uint8Array> {
  const fail = (ok: unknown, message: string): void => requireThat(ok, 'zip', message, 'ARCHIVE');
  fail(bytes.length >= 22 && bytes.length <= ARCHIVE_LIMITS.bytes, 'Invalid archive size');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  fail(view.getUint32(end, true) === 0x06054b50, 'ZIP comments/trailing bytes unsupported');
  const count = view.getUint16(end + 10, true), size = view.getUint32(end + 12, true), start = view.getUint32(end + 16, true);
  fail(view.getUint16(end + 4, true) === 0 && view.getUint16(end + 6, true) === 0 && view.getUint16(end + 8, true) === count && view.getUint16(end + 20, true) === 0, 'Multi-volume ZIP unsupported');
  fail(count >= 2 && count <= ARCHIVE_LIMITS.entries && start + size === end, 'Invalid central directory');
  const entries = new Map<string, Uint8Array>();
  let cursor = start, localEnd = 0, total = 0;
  for (let i = 0; i < count; i++) {
    fail(cursor + 46 <= end && view.getUint32(cursor, true) === 0x02014b50, 'Invalid directory entry');
    const flags = view.getUint16(cursor + 8, true), method = view.getUint16(cursor + 10, true);
    const crc = view.getUint32(cursor + 16, true), compressed = view.getUint32(cursor + 20, true), length = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true), extra = view.getUint16(cursor + 30, true), comment = view.getUint16(cursor + 32, true);
    const offset = view.getUint32(cursor + 42, true);
    fail(cursor + 46 + nameLength + extra + comment <= end, 'Truncated directory');
    const path = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    fail(validPath(path) && !entries.has(path), 'Unsafe or duplicate path');
    fail(method === 0 && (flags & ~0x800) === 0, 'v1 requires unencrypted STORE entries without data descriptors');
    fail(view.getUint16(cursor + 34, true) === 0 && (view.getUint32(cursor + 38, true) >>> 16 & 0xf000) !== 0xa000, 'Multi-volume entries and symlinks unsupported');
    total += length;
    fail(length === compressed && length <= ARCHIVE_LIMITS.entryBytes && total <= ARCHIVE_LIMITS.bytes, 'Entry size limit or compression mismatch');
    if (path.endsWith('.json') && !path.startsWith('assets/')) fail(length <= MAX_JSON_BYTES, 'JSON size limit');
    fail(offset === localEnd && offset + 30 <= start && view.getUint32(offset, true) === 0x04034b50, 'Invalid/overlapping local entry');
    const localNameLength = view.getUint16(offset + 26, true), localExtra = view.getUint16(offset + 28, true);
    const payload = offset + 30 + localNameLength + localExtra;
    fail(payload + length <= start && localNameLength === nameLength, 'Truncated local entry');
    fail(decoder.decode(bytes.subarray(offset + 30, offset + 30 + localNameLength)) === path && view.getUint16(offset + 6, true) === flags && view.getUint16(offset + 8, true) === method && view.getUint32(offset + 14, true) === crc && view.getUint32(offset + 18, true) === compressed && view.getUint32(offset + 22, true) === length, 'Central/local header mismatch');
    const data = bytes.subarray(payload, payload + length);
    fail(crc32(data) === crc, `CRC mismatch: ${path}`);
    entries.set(path, data);
    localEnd = payload + length; cursor += 46 + nameLength + extra + comment;
  }
  fail(cursor === end && localEnd === start, 'Unexpected ZIP records');
  return entries;
}
/** Conservative byte signatures, not a media decoder. SVG/HTML are rejected in v1. */
function checkAsset(asset: Asset, data: Uint8Array) {
  const starts = (...signature: number[]) => signature.every((b, i) => data[i] === b);
  const signatures: Record<string, () => boolean> = {
    'image/png': () => starts(137, 80, 78, 71, 13, 10, 26, 10),
    'image/jpeg': () => starts(255, 216, 255),
    'font/woff': () => starts(119, 79, 70, 70),
    'font/woff2': () => starts(119, 79, 70, 50),
    'font/ttf': () => starts(0, 1, 0, 0) || starts(116, 114, 117, 101),
    'font/otf': () => starts(79, 84, 84, 79),
  };
  requireThat(Object.hasOwn(signatures, asset.mimeType) && signatures[asset.mimeType](), asset.path, 'Unsupported MIME type or signature mismatch', 'ASSET');
}
export async function exportZIP(campaign: Campaign, assets: ReadonlyMap<string, Uint8Array>): Promise<Uint8Array> {
  // Snapshot before the first await to prevent concurrent edits changing the manifest.
  const document = exportJSON(campaign);
  const c = importJSON(document);
  requireThat(assets.size === c.assets.length && c.assets.length + 2 <= ARCHIVE_LIMITS.entries, 'assets', 'Asset count mismatch/limit', 'ASSET');
  const files: Record<string, Uint8Array> = Object.create(null);
  files['campaign.json'] = encoder.encode(document);
  let total = files['campaign.json'].length;
  for (const asset of c.assets) {
    const data = assets.get(asset.path);
    requireThat(data, asset.path, 'Missing asset bytes', 'ASSET');
    total += data.length;
    requireThat(data.length <= ARCHIVE_LIMITS.entryBytes && total <= ARCHIVE_LIMITS.bytes, asset.path, 'Asset size limit', 'SIZE');
    files[asset.path] = new Uint8Array(data);
  }
  const manifest: ArchiveManifest = { archiveVersion: 1, files: [] };
  for (const path of Object.keys(files).sort()) {
    const data = files[path], asset = c.assets.find(a => a.path === path), hash = await sha256(data);
    if (asset) { checkAsset(asset, data); requireThat(hash === asset.sha256, path, 'SHA-256 mismatch', 'INTEGRITY'); }
    manifest.files.push({ path, size: data.length, sha256: hash, mimeType: asset?.mimeType ?? 'application/json' });
  }
  files['manifest.json'] = encoder.encode(JSON.stringify(manifest));
  const zip = zipSync(files, { level: 0, mtime: new Date(1980, 0, 1) });
  requireThat(zip.length <= ARCHIVE_LIMITS.bytes, 'zip', 'Archive size limit', 'SIZE');
  return zip;
}
export async function importZIP(input: Uint8Array): Promise<{ campaign: Campaign; assets: Map<string, Uint8Array> }> {
  requireThat(input.length <= ARCHIVE_LIMITS.bytes, 'zip', 'Archive size limit', 'SIZE');
  const entries = readZip(new Uint8Array(input));
  const manifestBytes = entries.get('manifest.json'), campaignBytes = entries.get('campaign.json');
  requireThat(manifestBytes && campaignBytes, 'zip', 'Missing manifest or campaign', 'ARCHIVE');
  const manifest = parseJSON(decoder.decode(manifestBytes));
  validateStructure('ArchiveManifest', manifest);
  const m = manifest as ArchiveManifest;
  const paths = m.files.map(f => f.path);
  requireThat(new Set(paths).size === paths.length && paths.length === entries.size - 1 && !paths.includes('manifest.json'), 'manifest', 'Manifest inventory mismatch', 'INTEGRITY');
  for (const file of m.files) {
    const data = entries.get(file.path);
    requireThat(data && data.length === file.size && await sha256(data) === file.sha256, file.path, 'Missing file/size/SHA-256 mismatch', 'INTEGRITY');
  }
  const campaign = importJSON(decoder.decode(campaignBytes));
  requireThat(campaign.assets.length + 2 === entries.size && m.files.find(f => f.path === 'campaign.json')?.mimeType === 'application/json', 'manifest', 'Unexpected file or MIME', 'INTEGRITY');
  const assets = new Map<string, Uint8Array>();
  for (const asset of campaign.assets) {
    const file = m.files.find(f => f.path === asset.path), data = entries.get(asset.path);
    requireThat(file && data && file.sha256 === asset.sha256 && file.mimeType === asset.mimeType, asset.path, 'Asset metadata mismatch', 'INTEGRITY');
    checkAsset(asset, data); assets.set(asset.path, new Uint8Array(data));
  }
  return { campaign, assets };
}
