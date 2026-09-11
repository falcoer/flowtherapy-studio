import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSupport, isCivilDate, resolveSupport, selectEvents, snapshotCampaign, validateCampaign, validateFormat, validateTemplate } from '../src/domain/core.js';
import { exportJSON, importJSON, migrateCampaign } from '../src/storage/json.js';
import { exportZIP, importZIP, sha256, ARCHIVE_LIMITS } from '../src/storage/archive.js';
import type { Campaign, Format, Template } from '../src/domain/model.js';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
const read = (path: string) => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const fixture = (): Campaign => read('examples/campaign-demo.json');
const reject = (edit: (c: Campaign) => void, pattern: RegExp = /./) => { const c = fixture(); edit(c); assert.throws(() => validateCampaign(c), pattern); };

test('catalogue and embedded snapshots validate against the same runtime contracts', () => {
  validateCampaign(fixture());
  validateTemplate(read('catalog/templates/agenda.json'));
  for (const name of ['a3', 'a4', 'portrait', 'square', 'story']) validateFormat(read(`catalog/formats/${name}.json`));
});
test('JSON round trip preserves Unicode, optional fields, empty override and local geometry', () => {
  const c = fixture();
  c.supports[0].overrides.title = '';
  c.supports[0].variants[0].placementOverrides.title = { visible: false, rotation: 0, frame: { x: 1, y: 2, width: 100, height: 50 }, style: { fill: '#fff' } };
  assert.deepEqual(importJSON(exportJSON(c)), c);
  const result = resolveSupport(c, c.supports[0].id);
  assert.equal(result.fields.title, '');
  assert.equal(result.variants[0].placements[0].visible, false);
  assert.deepEqual(result.variants[0].placements[0].style, { fill: '#fff' });
  assert.deepEqual(result.variants[0].placements[0].frame, { x: 1, y: 2, width: 100, height: 50 });
  assert.notDeepEqual(c.supports[0].template.layouts[0].placements[0].frame, result.variants[0].placements[0].frame);
});
test('resolution priority: support override, binding, then default; absent required fields fail', () => {
  const c = fixture(), s = c.supports[0];
  s.overrides.title = 'Local'; assert.equal(resolveSupport(c, s.id).fields.title, 'Local');
  delete s.overrides.title; c.content.title = 'Commun'; assert.equal(resolveSupport(c, s.id).fields.title, 'Commun');
  delete s.bindings.title; assert.equal(resolveSupport(c, s.id).fields.title, 'Nos prochains concerts');
  delete (s.template.fields[0] as { defaultValue?: string }).defaultValue;
  assert.throws(() => validateCampaign(c), /Required field/);
});
test('events retain civil dates and recorded/explicit selection order', () => {
  const c = fixture(), s = c.supports[0], events = c.content.events as import('../src/domain/model.js').EventRow[];
  assert.deepEqual(selectEvents(events, { mode: 'all' }), events);
  s.eventSelections.events = { mode: 'ids', ids: events.map(e => e.id).reverse() };
  assert.deepEqual((resolveSupport(c, s.id).fields.events as typeof events).map(e => e.id), events.map(e => e.id).reverse());
  assert.throws(() => selectEvents(events, { mode: 'ids', ids: ['deleted'] }), /Missing event/);
  assert.throws(() => selectEvents(events, { mode: 'ids', ids: [events[0].id, events[0].id] }), /duplicate/);
  s.eventSelections.events = { mode: 'ids', ids: [] }; assert.throws(() => validateCampaign(c), /minItems/);
  for (const valid of ['2024-02-29', '2000-02-29', '0001-01-01', '2026-03-29', '2026-10-25']) assert.equal(isCivilDate(valid), true);
  for (const invalid of ['1900-02-29', '2026-02-29', '2026-04-31', '0000-01-01', '2026-10-25T00:00:00Z', '2026-1-01']) assert.equal(isCivilDate(invalid), false);
});
test('collection overrides are explicit and selected against the replacement collection', () => {
  const c = fixture(), s = c.supports[0];
  s.overrides.events = [{ id: 'local', date: '2028-02-29', label: 'Fictif', location: 'Ville' }];
  s.eventSelections.events = { mode: 'ids', ids: ['local'] };
  assert.deepEqual(resolveSupport(c, s.id).fields.events, s.overrides.events);
  assert.equal((c.content.events as unknown[]).length, 2);
});
test('deleted references and unknown identifiers fail without hiding overrides', () => {
  reject(c => { delete c.content.title; c.supports[0].overrides.title = 'Local'; }, /Deleted bound content/);
  reject(c => { c.supports[0].variants[0].format.revision++; }, /snapshot mismatch/);
  reject(c => { c.supports[0].variants[0].layoutId = 'deleted'; }, /snapshot mismatch/);
  reject(c => { c.supports[0].variants[0].placementOverrides.deleted = { visible: false }; }, /Unknown overridden/);
  reject(c => { c.supports[0].bindings.unknown = 'title'; }, /Unknown field/);
  reject(c => { c.content.image = { assetId: 'deleted' }; }, /Missing asset/);
  reject(c => { c.supports[0].template.layers[0].style = { fill: 'brand:deleted' }; }, /Missing brand/);
});
test('invalid shapes, versions, duplicate IDs and numerical invariants are rejected', () => {
  reject(c => { (c as unknown as { schemaVersion: number }).schemaVersion = 1; });
  reject(c => { c.revision = 0; });
  reject(c => { c.supports.push(structuredClone(c.supports[0])); });
  reject(c => { c.supports[0].variants[0].placementOverrides.title = { frame: { x: 0, y: 0, width: -1, height: 1 } }; });
  reject(c => { c.supports[0].variants[0].format.surface.width = Number.NaN; });
  reject(c => { c.supports[0].overrides.title = [] as never; });
  reject(c => { (c.content.events as { date: string }[])[0].date = '2026-02-30'; });
  reject(c => { c.content.bad = undefined as never; });
  assert.throws(() => importJSON('{'));
  assert.throws(() => importJSON(JSON.stringify({ ...fixture(), extra: 'must not vanish' })));
  assert.throws(() => importJSON(exportJSON(fixture()).replace('"title": "Nos prochains concerts"', '"__proto__": "bad"')));
});
test('snapshots are detached and frozen, and catalogue updates cannot erase customizations', () => {
  const c = fixture(), snapshot = snapshotCampaign(c);
  c.name = 'Changed'; assert.notEqual(snapshot.name, c.name);
  assert(Object.isFrozen(snapshot.supports[0].template.layers));
  const template = read('catalog/templates/agenda.json') as Template;
  const format = read('catalog/formats/square.json') as Format;
  const support = createSupport({ id: 'local:support', name: 'Test', template, formats: [format], layoutIds: ['square'], bindings: { events: 'events' } });
  support.overrides.title = 'Ma personnalisation'; template.name = 'Nouvelle version'; format.surface.width = 42;
  assert.notEqual(support.template.name, template.name); assert.equal(support.variants[0].format.surface.width, 1080);
  const local = fixture(); local.supports = [support]; assert.equal(importJSON(exportJSON(local)).supports[0].overrides.title, 'Ma personnalisation');
});
test('migrations require an explicit path, operate on copies and validate the output', () => {
  const c = fixture(); assert.deepEqual(migrateCampaign(c).campaign, c);
  assert.throws(() => migrateCampaign({ ...c, schemaVersion: 3 }), /Unsupported version/);
  assert.throws(() => migrateCampaign({ ...c, schemaVersion: 0 }), /No unique explicit migration/);
  const legacy = { ...c, schemaVersion: 1 };
  const result = migrateCampaign(legacy);
  assert.equal(legacy.schemaVersion, 1);
  assert.equal(result.campaign.schemaVersion, 2);
  assert.deepEqual(result.original, legacy);
  assert.deepEqual(result.steps, [{ from: 1, to: 2 }]);
  assert.throws(() => migrateCampaign({ ...c, schemaVersion: 0 }));
  assert.throws(() => migrateCampaign(legacy, [{ from: 1, to: 2, migrate: () => ({ schemaVersion: 2 }) }]));
});
// A real, tiny PNG fixture; no personal media.
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv1kAAAAASUVORK5CYII=', 'base64'));
async function withAsset() {
  const campaign = fixture();
  campaign.assets.push({ id: 'demo:pixel', path: 'assets/pixel.png', mimeType: 'image/png', sha256: await sha256(png), source: 'Generated test pixel', rights: 'Test fixture' });
  campaign.content.image = { assetId: 'demo:pixel' };
  return { campaign, assets: new Map([['assets/pixel.png', png]]) };
}
test('ZIP round trips campaign and binary assets; export is deterministic', async () => {
  const { campaign, assets } = await withAsset();
  const bytes = await exportZIP(campaign, assets);
  const restored = await importZIP(bytes);
  assert.deepEqual(restored.campaign, campaign); assert.deepEqual(restored.assets, assets);
  assert.deepEqual(await exportZIP(campaign, assets), bytes);
  const empty = fixture(); assert.deepEqual((await importZIP(await exportZIP(empty, new Map()))).campaign, empty);
});
test('ZIP rejects missing bytes, hash mismatch, unsupported SVG and MIME spoofing', async () => {
  const { campaign, assets } = await withAsset();
  await assert.rejects(exportZIP(campaign, new Map()), /count mismatch/);
  const bad = structuredClone(campaign); bad.assets[0].sha256 = '0'.repeat(64);
  await assert.rejects(exportZIP(bad, assets), /SHA-256/);
  for (const mime of ['image/svg+xml', 'text/html', 'image/jpeg']) {
    const c = structuredClone(campaign); c.assets[0].mimeType = mime;
    await assert.rejects(exportZIP(c, assets), /MIME/);
  }
  const unsafe = structuredClone(campaign); unsafe.assets[0].path = 'assets/../escape.png';
  await assert.rejects(exportZIP(unsafe, assets), /Unsafe/);
});
test('ZIP validates inventory, manifest digest, bytes and local headers', async () => {
  const { campaign, assets } = await withAsset();
  const valid = await exportZIP(campaign, assets);
  const files = unzipSync(valid);
  const altered = { ...files, 'assets/pixel.png': new Uint8Array(files['assets/pixel.png']) };
  altered['assets/pixel.png'][12] ^= 1;
  await assert.rejects(importZIP(zipSync(altered, { level: 0 })), /SHA-256/);
  await assert.rejects(importZIP(zipSync({ ...files, 'assets/extra.png': png }, { level: 0 })), /inventory/);
  await assert.rejects(importZIP(zipSync({ ...files, '../escape': png }, { level: 0 })), /Unsafe/);
  const manifest = JSON.parse(strFromU8(files['manifest.json'])); manifest.archiveVersion = 2;
  await assert.rejects(importZIP(zipSync({ ...files, 'manifest.json': strToU8(JSON.stringify(manifest)) }, { level: 0 })));
  const localMismatch = new Uint8Array(valid); localMismatch[30] ^= 1;
  await assert.rejects(importZIP(localMismatch), /header mismatch/);
  const corrupt = new Uint8Array(valid); corrupt[100] ^= 1;
  await assert.rejects(importZIP(corrupt), /CRC mismatch/);
});
test('ZIP rejects compressed, oversized and truncated input before decompression', async () => {
  const c = fixture(); const valid = await exportZIP(c, new Map());
  await assert.rejects(importZIP(zipSync(unzipSync(valid), { level: 6 })), /STORE/);
  await assert.rejects(importZIP(valid.subarray(0, valid.length - 1)));
  await assert.rejects(importZIP(new Uint8Array(ARCHIVE_LIMITS.bytes + 1)), /size limit/);
});
