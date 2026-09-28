import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { indexedDB } from "fake-indexeddb";
import {
  baseStyle,
  changeSurface,
  instantiate,
  parseCatalog,
  parseProject,
  removeAnchor,
  snapAnchor,
  type Project,
  type Surface,
  type Preset,
} from "../src/graphics/model.js";
import { loadWorkspace, saveWorkspace } from "../src/graphics/storage.js";
const read = (name: string) =>
  readFileSync(
    new URL(`../catalog/graphics/${name}.json`, import.meta.url),
    "utf8",
  );
const surfaces = parseCatalog<Surface>(read("surfaces"), "ft-surfaces");
const palette = parseCatalog<Preset>(read("renderers"), "ft-renderers");
const fixture = (): Project => ({
  kind: "ft-graphic-project",
  schemaVersion: 1,
  name: "Épreuve de composition",
  surface: { ...surfaces.items[0] },
  background: "#101523",
  duration: 2,
  fps: 12,
  anchors: [
    { id: "a", name: "Gauche", x: 0.2, y: 0.3 },
    { id: "b", name: "Droite", x: 0.8, y: 0.7 },
  ],
  renderers: [
    {
      ...baseStyle,
      id: "r",
      name: "Texte complet",
      kind: "text",
      anchorId: "a",
      z: 1,
      text: "Une première ligne\n日本語 — intégral",
    },
  ],
  assets: [],
});
test("graphic catalogs and document round trip preserve Unicode, parameters and snapshots", () => {
  assert.equal(surfaces.items.length, 5);
  assert.equal(palette.items.length, 5);
  const p = fixture();
  assert.deepEqual(parseProject(JSON.stringify(p)), p);
  const r = instantiate(palette.items[0], "a", p);
  r.color = "#ff0000";
  assert.notEqual(r.color, palette.items[0].style.color);
});
test("magnetism chooses exact midpoint before axes and highlights its defining anchors", () => {
  const p = fixture();
  const snap = snapAnchor({ x: 0.506, y: 0.491 }, p.anchors, {
    x: 0.02,
    y: 0.02,
  });
  assert.deepEqual([snap.x, snap.y], [0.5, 0.5]);
  assert.equal(snap.guides[0].kind, "midpoint");
  assert.equal(snap.guides[0].from?.id, "a");
  const aligned = snapAnchor({ x: 0.209, y: 0.699 }, p.anchors, {
    x: 0.015,
    y: 0.015,
  });
  assert.equal(aligned.x, 0.2);
  assert.equal(aligned.y, 0.7);
  assert.deepEqual(
    aligned.guides.map((g) => g.kind),
    ["x", "y"],
  );
  const free = snapAnchor({ x: 0.26, y: 0.4 }, p.anchors, { x: 0.01, y: 0.01 });
  assert.deepEqual(free.guides, []);
});
test("surface changes preserve anchors and proportionally transform local geometry", () => {
  const p = fixture();
  p.renderers[0].offsetX = 50;
  const next = changeSurface(p, { ...p.surface, width: 2160, height: 2700 });
  assert.deepEqual(next.anchors, p.anchors);
  assert.equal(next.renderers[0].width, p.renderers[0].width * 2);
  assert.equal(next.renderers[0].offsetX, 100);
  assert.equal(next.renderers[0].fontSize, p.renderers[0].fontSize * 2);
  assert.equal(p.surface.width, 1080);
});
test("anchor deletion removes only attached renderers without mutating the source", () => {
  const p = fixture();
  p.renderers.push({ ...p.renderers[0], id: "other", anchorId: "b" });
  const next = removeAnchor(p, "a");
  assert.equal(next.anchors.length, 1);
  assert.deepEqual(
    next.renderers.map((r) => r.id),
    ["other"],
  );
  assert.equal(p.renderers.length, 2);
});
test("untrusted imports reject future versions, bad references, dimensions, duplicate ids and external images", () => {
  for (const mutate of [
    (p: any) => (p.schemaVersion = 2),
    (p: any) => (p.surface.width = Infinity),
    (p: any) => (p.surface.height = 0),
    (p: any) => (p.renderers[0].anchorId = "missing"),
    (p: any) => (p.renderers[0].opacity = 2),
    (p: any) => (p.renderers[0].shader = "unknown"),
    (p: any) => (p.renderers[0].font = "remote-font"),
    (p: any) => p.anchors.push(p.anchors[0]),
    (p: any) => (p.fps = 1.5),
    (p: any) =>
      p.assets.push({
        id: "x",
        name: "image",
        rights: "",
        dataUrl: "https://example.org/a.png",
      }),
  ]) {
    const p = fixture();
    mutate(p);
    assert.throws(() => parseProject(JSON.stringify(p)));
  }
  const c = JSON.parse(read("surfaces"));
  c.items[0].width = 20000;
  assert.throws(() => parseCatalog(JSON.stringify(c), "ft-surfaces"));
  assert.throws(() => parseCatalog(read("renderers"), "ft-surfaces"));
});
test("independent IndexedDB workspace persists project and both catalogs", async () => {
  Object.defineProperty(globalThis, "indexedDB", {
    value: indexedDB,
    configurable: true,
  });
  const data = { project: fixture(), palette, surfaces };
  await saveWorkspace(data);
  assert.deepEqual(await loadWorkspace(), data);
});
