// Contrôle ciblé des fixtures ; ne remplace pas un validateur d'import runtime.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const read = async p => JSON.parse(await readFile(new URL('../' + p, import.meta.url), 'utf8'));
const unique = xs => assert.equal(new Set(xs).size, xs.length, 'Identifiants dupliqués');
const format = f => {
  assert.equal(f.schemaVersion, 1);
  assert(f.surface.width > 0 && f.surface.height > 0);
  unique(f.exports.map(x => x.id));
  assert(f.exports.some(x => x.id === f.defaultExportId));
  for (const inset of [f.zones.bleed, f.zones.safeInset])
    for (const n of Object.values(inset)) assert(n >= 0);
  const s = f.zones.safeInset;
  assert(s.left + s.right < f.surface.width && s.top + s.bottom < f.surface.height);
  for (const e of f.exports) {
    if (e.type === 'raster') {
      assert.equal(e.resolution.mode, f.surface.unit === 'px' ? 'scale' : 'dpi');
      assert((e.resolution.factor ?? e.resolution.value) > 0);
      if (e.mimeType === 'image/jpeg') assert(e.background);
    } else assert.equal(f.surface.unit, 'mm');
  }
};
const c = await read('examples/campaign-demo.json');
assert.equal(c.schemaVersion, 3);
unique(c.supports.map(s => s.id));
unique(c.content.events.map(e => e.id));
for (const e of c.content.events) {
  assert(/^\d{4}-\d{2}-\d{2}$/.test(e.date));
  assert.equal(new Date(e.date + 'T00:00:00Z').toISOString().slice(0, 10), e.date);
  assert(e.label && e.location);
}
for (const s of c.supports) {
  const t = s.template;
  unique(t.fields.map(x => x.id)); unique(t.layers.map(x => x.id)); unique(t.layouts.map(x => x.id));
  assert.deepEqual(t, await read('catalog/templates/agenda.json'));
  for (const [key, value] of Object.entries(s.bindings)) {
    assert(t.fields.some(f => f.id === key)); assert(Object.hasOwn(c.content, value));
  }
  for (const [key, selection] of Object.entries(s.eventSelections)) {
    const rows = c.content[s.bindings[key]];
    assert(Array.isArray(rows));
    if (selection.mode === 'ids') {
      unique(selection.ids); for (const id of selection.ids) assert(rows.some(e => e.id === id));
    }
  }
  for (const v of s.variants) {
    format(v.format);
    const l = t.layouts.find(x => x.id === v.layoutId); assert(l);
    assert.equal(l.formatRef.id, v.format.id); assert.equal(l.formatRef.revision, v.format.revision);
    assert.deepEqual(v.format, await read('catalog/formats/' + v.layoutId + '.json'));
    unique(l.placements.map(p => p.layerId));
    for (const p of l.placements) {
      assert(t.layers.some(x => x.id === p.layerId));
      assert(p.frame.width > 0 && p.frame.height > 0);
    }
  }
}
assert.deepEqual(JSON.parse(JSON.stringify(c)), c);
console.log('OK : fixtures, snapshots, formats, dates, références et round-trip JSON.');
