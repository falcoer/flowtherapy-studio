import { test } from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import {
  IndexedDBCampaignStore,
  RevisionConflict,
} from "../src/storage/indexeddb.js";
import {
  newCampaign,
  activate,
  adjust,
  edit,
  undo,
  redo,
} from "../src/editor/state.js";
import { agenda, formats } from "../src/editor/catalog.js";
import { sha256 } from "../src/storage/archive.js";

function prepared() {
  const b = newCampaign();
  b.campaign.content.events = [
    {
      id: "event-1",
      date: "2026-10-17",
      label: "Concert fictif",
      location: "Ville exemple",
    },
  ];
  b.campaign = activate(b.campaign, agenda, formats, "square");
  return b;
}
test("two connections cannot overwrite, create twice or delete a stale revision", async () => {
  const factory = new IDBFactory(),
    a = new IndexedDBCampaignStore("race", factory),
    b = new IndexedDBCampaignStore("race", factory);
  const c = prepared().campaign;
  assert.equal((await a.save(c, null)).revision, 1);
  await assert.rejects(b.save(c, null), RevisionConflict);
  const results = await Promise.allSettled([
    a.save({ ...c, name: "A" }, 1),
    b.save({ ...c, name: "B" }, 1),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    results.filter(
      (r) => r.status === "rejected" && r.reason instanceof RevisionConflict,
    ).length,
    1,
  );
  assert.equal((await a.load(c.id)).revision, 2);
  await assert.rejects(a.delete(c.id, 1), RevisionConflict);
  assert.equal((await b.list()).length, 1);
  await a.delete(c.id, 2);
  await assert.rejects(b.load(c.id), /introuvable/);
  await Promise.all([a.close(), b.close()]);
});
test("document and binaries are isolated, atomic and integrity checked; JSON may lack bytes", async () => {
  const factory = new IDBFactory(),
    s = new IndexedDBCampaignStore("assets", factory),
    bundle = prepared();
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  bundle.campaign.assets.push({
    id: "photo",
    path: "assets/photo.png",
    mimeType: "image/png",
    sha256: await sha256(bytes),
    source: "Fixture",
    rights: "Test",
  });
  bundle.assets.set("assets/photo.png", bytes);
  const saved = await s.saveBundle(bundle, null);
  bytes[0] = 0;
  assert.equal(
    (await s.loadBundle(saved.id)).assets.get("assets/photo.png")![0],
    137,
  );
  await assert.rejects(s.saveBundle(bundle, 1));
  assert.equal((await s.load(saved.id)).revision, 1);
  const altered = await s.loadBundle(saved.id);
  altered.campaign.name = "Changed";
  await s.save(altered.campaign, 1);
  assert.equal((await s.loadBundle(saved.id)).assets.size, 1);
  const json = structuredClone(bundle);
  json.campaign.id = "json-import";
  json.assets.clear();
  await s.saveBundle(json, null);
  assert.equal((await s.loadBundle("json-import")).assets.size, 0);
  await s.close();
});
test("adjustments remain in one variant, respect locks and undo/redo includes images", () => {
  const b = prepared(),
    c = b.campaign,
    s = c.supports[0],
    v = s.variants[0];
  const frame = s.template.layouts[0].placements[0].frame;
  const next = adjust(c, s.id, v.id, "title", { frame: { ...frame, x: 200 } });
  assert.equal(
    next.supports[0].variants[0].placementOverrides.title.frame!.x,
    200,
  );
  assert.equal(c.supports[0].variants[0].placementOverrides.title, undefined);
  assert.deepEqual(next.supports[0].template, s.template);
  c.supports[0].template.layers[0].editing.move = false;
  assert.throws(
    () => adjust(c, s.id, v.id, "title", { frame: { ...frame, x: 3 } }),
    /verrouillé/,
  );
  assert.throws(
    () =>
      adjust(c, s.id, v.id, "title", {
        imageFit: { mode: "cover", focalX: 0.2, focalY: 0.5 },
      }),
    /verrouillé/,
  );
  let h = { past: [] as (typeof b)[], present: b, future: [] as (typeof b)[] };
  const image = {
    campaign: next,
    assets: new Map([["assets/new.png", new Uint8Array([1])]]),
  };
  h = edit(h, image);
  h = undo(h);
  assert.equal(h.present.assets.size, 0);
  h = redo(h);
  assert.equal(h.present.assets.size, 1);
  h = edit(undo(h), b);
  assert.equal(h.future.length, 0);
});
