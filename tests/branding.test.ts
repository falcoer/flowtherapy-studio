import { test } from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import {
  IndexedDBCampaignStore,
  RevisionConflict,
} from "../src/storage/indexeddb.js";
import { newCampaign } from "../src/editor/state.js";
import { applyBrand } from "../src/domain/branding.js";
import { exportZIP, importZIP, sha256 } from "../src/storage/archive.js";
import { exportJSON, importJSON } from "../src/storage/json.js";
import { validateCampaign } from "../src/domain/core.js";
import type { Brand } from "../src/domain/model.js";

async function fixture() {
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const asset = {
    id: "logo",
    path: "assets/logo.png",
    mimeType: "image/png",
    sha256: await sha256(bytes),
    source: "Fixture",
    rights: "Test",
    credit: "Auteur fictif",
  };
  const brand: Brand = {
    schemaVersion: 1,
    id: "brand",
    revision: 1,
    name: "Identité test",
    colors: { accent: "#ff00aa" },
    fonts: {},
    logos: { primary: { assetId: "logo" } },
  };
  return { asset, bytes, brand };
}
const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
test("brand application is detached, deduplicates resources, preserves JSON/ZIP and rejects broken logos", async () => {
  const { asset, bytes, brand } = await fixture(),
    bundle = newCampaign();
  bundle.campaign.assets = [
    { ...asset, id: "existing", path: "assets/existing.png" },
  ];
  const c = applyBrand(bundle.campaign, brand, [asset]);
  assert.equal(c.assets.length, 1);
  assert.equal(c.brand!.logos!.primary.assetId, "existing");
  brand.colors.accent = "#000000";
  assert.equal(c.brand!.colors.accent, "#ff00aa");
  assert.equal(bundle.campaign.brand, undefined);
  assert.deepEqual(importJSON(exportJSON(c)), c);
  const restored = await importZIP(
    await exportZIP(c, new Map([["assets/existing.png", bytes]])),
  );
  assert.deepEqual(restored.campaign, c);
  c.brand!.logos!.primary.assetId = "missing";
  assert.throws(() => validateCampaign(c));
});
test("resources and campaigns share one binary, retain snapshots, and brand revisions conflict atomically", async () => {
  const factory = new IDBFactory(),
    store = new IndexedDBCampaignStore("central", factory);
  const { asset, bytes, brand } = await fixture();
  await store.importResource(asset, bytes);
  const duplicate = await store.importResource(
    { ...asset, id: "different", path: "assets/again.png", credit: "Other" },
    bytes,
  );
  assert.deepEqual(duplicate, asset);
  const b = newCampaign();
  b.campaign.brand = brand;
  b.campaign.assets = [asset];
  b.assets.set(asset.path, bytes);
  await store.saveBundle(b, null);
  await store.saveBundle(
    { ...b, campaign: { ...b.campaign, id: "second" } },
    null,
  );
  const identity = await store.saveBrand(
    { ...b, campaign: { ...b.campaign, id: "studio-brand" } },
    null,
  );
  assert.equal(identity.brand!.revision, 1);
  await assert.rejects(
    store.saveBrand({ ...b, campaign: { ...identity, name: "Other" } }, null),
    RevisionConflict,
  );
  await store.saveBrand({ ...b, campaign: identity }, 1);
  assert.equal((await store.loadBrand())!.campaign.brand!.revision, 2);
  assert.equal(
    (await store.loadBundle(b.campaign.id)).campaign.brand!.revision,
    1,
  );
  await store.delete(b.campaign.id, 1);
  assert.deepEqual(
    (await store.loadBundle("second")).assets.get(asset.path),
    bytes,
  );
  const db = await request(factory.open("central", 2));
  assert.equal(
    await request(db.transaction("blobs").objectStore("blobs").count()),
    1,
  );
  assert.equal((await store.listResources()).length, 1);
  const corrupted = new Uint8Array(bytes);
  corrupted[0] = 0;
  await assert.rejects(store.importResource(asset, corrupted));
  assert.deepEqual((await store.loadResource(asset.sha256)).bytes, bytes);
  db.close();
  await store.close();
});
test("v1 storage upgrade preserves revisions, bytes and missing references", async () => {
  const factory = new IDBFactory(),
    { asset, bytes } = await fixture(),
    b = newCampaign();
  b.campaign.revision = 7;
  b.campaign.assets = [asset];
  b.assets.set(asset.path, bytes);
  const open = factory.open("legacy", 1);
  open.onupgradeneeded = () =>
    open.result.createObjectStore("campaigns", { keyPath: "campaign.id" });
  const db = await request(open),
    tx = db.transaction("campaigns", "readwrite");
  tx.objectStore("campaigns").put(b);
  tx.objectStore("campaigns").put({
    campaign: { ...b.campaign, id: "missing" },
    assets: new Map(),
  });
  await new Promise<void>((resolve) => {
    tx.oncomplete = () => resolve();
  });
  db.close();
  const store = new IndexedDBCampaignStore("legacy", factory);
  assert.deepEqual(await store.loadBundle(b.campaign.id), b);
  assert.equal((await store.loadBundle("missing")).assets.size, 0);
  assert.deepEqual(await store.listResources(), [asset]);
  await store.close();
});
