import { test } from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import type { Brand } from "../src/domain/model.js";
import { migrateBrandV2 } from "../src/domain/brand-configuration.js";
import {
  BrandConfigurationConflict,
  BrandConfigurationStore,
} from "../src/storage/brand-configuration.js";

const brand: Brand = {
  schemaVersion: 2,
  id: "import-revision-test",
  revision: 1,
  name: "Import revision test",
  colors: { blue: "#0055AA" },
  fonts: {},
  logos: {},
};

test("import replacement derives its revision from the stored document", async () => {
  const store = new BrandConfigurationStore("brand-import-revision-test", new IDBFactory()),
    initial = migrateBrandV2(brand),
    first = await store.save(initial, null),
    second = await store.save(first, 1),
    olderBackup = { ...structuredClone(initial), revision: 1 },
    imported = await store.replaceImported(olderBackup);

  assert.equal(second.revision, 2);
  assert.equal(imported.revision, 3);
  await assert.rejects(store.save(second, 2), BrandConfigurationConflict);
  assert.equal((await store.load(brand.id))?.revision, 3);
  await store.close();
});
