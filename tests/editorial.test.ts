import { test } from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import {
  validateEditorial,
  validateCampaign,
  campaignContent,
  editorialKey,
  resolveSupport,
  validateTemplate,
  editorialPlainText,
} from "../src/domain/core.js";
import {
  newEditorial,
  includeEditorial,
  removeEditorial,
  bindEditorialField,
} from "../src/domain/editorial.js";
import { newCampaign, activate } from "../src/editor/state.js";
import { formats, agenda, templates } from "../src/editor/catalog.js";
import { IndexedDBCampaignStore } from "../src/storage/indexeddb.js";
import {
  exportJSON,
  importJSON,
  migrateCampaign,
} from "../src/storage/json.js";
import { exportZIP, importZIP, sha256 } from "../src/storage/archive.js";
import {
  selectEditorial,
  exportEditorial,
  restoreEditorial,
  resourceBundle,
} from "../src/storage/editorial.js";
import type { Asset, EditorialDocument } from "../src/domain/model.js";

function article(id = "article:1"): EditorialDocument {
  return {
    ...newEditorial(id),
    title: "Concert fictif",
    summary: "Un résumé de recette",
    body: "## Coulisses\nLe texte **complet** reste *conservé*.\n- Un détail",
    tags: ["Musique"],
    status: "ready",
  };
}
const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv1kAAAAASUVORK5CYII=",
    "base64",
  ),
);
async function asset(): Promise<Asset> {
  return {
    id: "test:photo",
    path: "assets/photo.png",
    sha256: await sha256(png),
    mimeType: "image/png",
    source: "Photo fictive",
    rights: "Fixture de test",
    credit: "Auteur fictif",
  };
}
const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });

test("editorial contracts reject unknown fields, unsafe resources, invalid dates and oversized text", async () => {
  const a = await asset();
  validateEditorial(article());
  assert.throws(() => validateEditorial(newEditorial("draft")), /Titre requis/);
  assert.throws(() => validateEditorial({ ...article(), extra: true }));
  assert.throws(
    () => validateEditorial({ ...article(), body: "a".repeat(200001) }),
    /volumineux/,
  );
  assert.throws(
    () => validateEditorial({ ...article(), tags: ["a", "a"] }),
    /duplicate/,
  );
  assert.throws(
    () =>
      validateEditorial({
        ...article(),
        event: { date: "2026-10-12", location: "Ville" },
      }),
    /réservés/,
  );
  const event = {
    ...newEditorial("event", "event"),
    title: "Événement fictif",
  };
  validateEditorial(event); // Incomplete dates and location are permitted in drafts only.
  assert.throws(
    () => validateEditorial({ ...event, status: "ready" }),
    /date et le lieu/,
  );
  assert.throws(
    () =>
      validateEditorial({
        ...event,
        event: { date: "2026-02-30", location: "Ville" },
      }),
    /Date civile/,
  );
  assert.throws(() =>
    validateEditorial({
      ...article(),
      assets: [{ ...a, mimeType: "image/svg+xml" }],
    }),
  );
  assert.throws(() =>
    validateEditorial({
      ...article(),
      assets: [{ ...a, path: "../escape.png" }],
    }),
  );
});

test("editorial selection preserves source revisions, isolates snapshots and resolves content without scalar duplication", () => {
  const source = article(),
    original = newCampaign().campaign,
    before = structuredClone(original);
  const campaign = includeEditorial(original, source);
  source.title = "Réécriture";
  source.body = "Autre texte";
  assert.deepEqual(original, before);
  assert.equal(campaign.editorial![0].title, "Concert fictif");
  assert.equal(Object.keys(campaign.content).length, 2);
  assert.equal(
    campaignContent(campaign)[editorialKey(source.id, "body")],
    "Coulisses\nLe texte complet reste conservé.\n• Un détail",
  );
  assert.deepEqual(importJSON(exportJSON(campaign)), campaign);
  assert.throws(
    () => includeEditorial(campaign, article()),
    /déjà sélectionné/,
  );
  assert.throws(
    () => includeEditorial(original, { ...article(), status: "archived" }),
    /archivé/,
  );
  const clash = structuredClone(campaign);
  clash.content[editorialKey(source.id, "title")] = "Collision";
  assert.throws(() => validateCampaign(clash), /Collision/);
});

test("typed bindings retain overrides until explicitly replaced and protect removal of referenced content", () => {
  let c = includeEditorial(newCampaign().campaign, article());
  const template = templates.find((t) => t.id === "ft:editorial-note")!;
  validateTemplate(template);
  c = activate(c, template, formats, "square");
  const support = c.supports[0];
  assert.equal(resolveSupport(c, support.id).fields.title, "Concert fictif");
  assert.equal(
    resolveSupport(c, support.id).fields.body,
    editorialPlainText(article().body),
  );
  support.overrides.body = "Version locale";
  assert.equal(resolveSupport(c, support.id).fields.body, "Version locale");
  const bound = bindEditorialField(
    c,
    support.id,
    "body",
    editorialKey(article().id, "summary"),
  );
  assert.equal(
    resolveSupport(bound, support.id).fields.body,
    article().summary,
  );
  assert.equal(support.overrides.body, "Version locale");
  assert.throws(
    () => removeEditorial(c, article().id),
    /Deleted bound content/,
  );
  assert.throws(
    () => bindEditorialField(c, support.id, "body", "events"),
    /incompatible/,
  );
  const empty = structuredClone(c);
  empty.supports = [];
  assert.equal(removeEditorial(empty, article().id).editorial!.length, 0);
});

test("ordered editorial events become an agenda collection without modifying manually entered events", () => {
  let c = newCampaign().campaign;
  for (const id of ["event:2", "event:1"])
    c = includeEditorial(c, {
      ...newEditorial(id, "event"),
      title: `Fictif ${id}`,
      status: "ready",
      event: { date: "2026-10-24", location: "Ville exemple" },
    });
  c = activate(c, agenda, formats, "square");
  assert.equal(c.supports[0].bindings.events, "editorial:events");
  assert.deepEqual(
    (resolveSupport(c, c.supports[0].id).fields.events as { id: string }[]).map(
      (e) => e.id,
    ),
    ["event:2", "event:1"],
  );
  assert.deepEqual(c.content.events, []);
  c.editorial!.reverse();
  assert.deepEqual(
    (resolveSupport(c, c.supports[0].id).fields.events as { id: string }[]).map(
      (e) => e.id,
    ),
    ["event:1", "event:2"],
  );
});

test("shared binaries are deduplicated and editorial snapshots survive campaign ZIP round trips", async () => {
  const store = new IndexedDBCampaignStore("dedup", new IDBFactory());
  const a = await asset();
  await store.importResource(a, png);
  const source = { ...article(), assets: [a] };
  await store.saveEditorial(source, null);
  const original = newCampaign();
  original.campaign.assets = [
    { ...a, id: "campaign:photo", path: "assets/existing.png" },
  ];
  original.assets.set("assets/existing.png", png);
  const next = await selectEditorial(original, source, store);
  assert.equal(next.campaign.assets.length, 1);
  assert.equal(next.assets.size, 1);
  assert.equal(next.campaign.editorial![0].assets[0].id, "campaign:photo");
  const restored = await importZIP(await exportZIP(next.campaign, next.assets));
  assert.deepEqual(restored, next);
  assert.equal(original.campaign.editorial, undefined);
  await store.close();
});

test("two connections enforce editorial revisions and roll back missing-resource writes", async () => {
  const factory = new IDBFactory(),
    a = new IndexedDBCampaignStore("conflict", factory),
    b = new IndexedDBCampaignStore("conflict", factory);
  const first = await a.saveEditorial(article(), null);
  const results = await Promise.allSettled([
    a.saveEditorial({ ...first, title: "A" }, 1),
    b.saveEditorial({ ...first, title: "B" }, 1),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await a.loadEditorial(first.id)).revision, 2);
  await assert.rejects(a.saveEditorial(first, null), /autre onglet/);
  await assert.rejects(
    a.saveEditorial({ ...article("missing"), assets: [await asset()] }, null),
    /absent/,
  );
  assert.equal(
    (await a.listEditorial()).some((d) => d.id === "missing"),
    false,
  );
  assert.equal((await a.loadEditorial(first.id)).revision, 2);
  await a.close();
  await b.close();
});

test("resource metadata updates are conflict-checked and do not alter authored snapshots", async () => {
  const store = new IndexedDBCampaignStore("metadata", new IDBFactory()),
    a = await asset();
  await store.importResource(a, png);
  await store.saveEditorial({ ...article(), assets: [a] }, null);
  const updated = await store.updateResource(a, {
    source: "Autre nom",
    rights: "Autres droits",
    credit: "Autre auteur",
  });
  assert.equal(updated.source, "Autre nom");
  await assert.rejects(
    store.updateResource(a, { source: "Obsolète", rights: a.rights }),
    /autre onglet/,
  );
  assert.equal(
    (await store.loadEditorial(article().id)).assets[0].source,
    a.source,
  );
  await assert.rejects(
    store.updateResource(updated, { source: "", rights: a.rights }),
  );
  assert.deepEqual((await store.loadResource(a.sha256)).bytes, png);
  await store.close();
});

test("individual editorial ZIP restores a new local document and reuses existing resources", async () => {
  const store = new IndexedDBCampaignStore("backup", new IDBFactory()),
    a = await asset();
  await store.importResource(a, png);
  const source = await store.saveEditorial({ ...article(), assets: [a] }, null);
  const bytes = await exportEditorial(source, store);
  const restored = await restoreEditorial(bytes, store, "restored");
  assert.equal(restored.id, "restored");
  assert.equal(restored.revision, 1);
  assert.equal(restored.body, source.body);
  assert.deepEqual(restored.assets, source.assets);
  assert.equal((await store.listEditorial()).length, 2);
  assert.equal((await store.listResources()).length, 1);
  await assert.rejects(
    restoreEditorial(bytes, store, source.id),
    /autre onglet/,
  );
  const bundle = await resourceBundle(store, await store.listResources());
  assert.deepEqual(
    (
      await importZIP(await exportZIP(bundle.campaign, bundle.assets))
    ).assets.get(a.path),
    png,
  );
  await store.close();
});

test("v2 database upgrade retains campaign/brand revisions, binaries and missing-file state", async () => {
  const factory = new IDBFactory(),
    name = "legacy-v2",
    open = factory.open(name, 2);
  open.onupgradeneeded = () => {
    const db = open.result;
    for (const table of ["campaigns", "brands"])
      db.createObjectStore(table, { keyPath: "campaign.id" });
    db.createObjectStore("resources", { keyPath: "sha256" });
    db.createObjectStore("blobs");
  };
  const db = await request(open),
    a = await asset(),
    campaign = {
      ...newCampaign().campaign,
      schemaVersion: 2,
      revision: 9,
      assets: [a],
    };
  const tx = db.transaction(
      ["campaigns", "brands", "resources", "blobs"],
      "readwrite",
    ),
    finished = done(tx);
  tx.objectStore("campaigns").put({
    campaign,
    assetHashes: new Map([[a.path, a.sha256]]),
  });
  tx.objectStore("campaigns").put({
    campaign: { ...campaign, id: "missing" },
    assetHashes: new Map(),
  });
  tx.objectStore("brands").put({
    campaign: {
      ...campaign,
      id: "brand",
      brand: {
        schemaVersion: 2,
        id: "brand",
        revision: 9,
        name: "Marque",
        colors: {},
        fonts: {},
      },
    },
    assetHashes: new Map(),
  });
  tx.objectStore("resources").put(a);
  tx.objectStore("blobs").put(png, a.sha256);
  await finished;
  db.close();
  const store = new IndexedDBCampaignStore(name, factory),
    loaded = await store.loadBundle(campaign.id);
  assert.equal(loaded.campaign.schemaVersion, 3);
  assert.equal(loaded.campaign.revision, 9);
  assert.equal(loaded.campaign.editorial, undefined);
  assert.deepEqual(loaded.assets.get(a.path), png);
  assert.equal((await store.loadBundle("missing")).assets.size, 0);
  assert.equal((await store.loadBrand())!.campaign.brand!.revision, 9);
  assert.deepEqual(await store.listEditorial(), []);
  const migrated = migrateCampaign(campaign);
  assert.deepEqual(migrated.steps, [{ from: 2, to: 3 }]);
  assert.equal(campaign.schemaVersion, 2);
  await store.close();
});
