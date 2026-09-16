import { test } from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import type { Brand } from "../src/domain/model.js";
import {
  latestRelease,
  migrateBrandV2,
} from "../src/domain/brand-configuration.js";
import {
  BrandConfigurationStore,
  importBrandConfiguration,
} from "../src/storage/brand-configuration.js";

function brand(id: string, colors: Record<string, string>): Brand {
  return {
    schemaVersion: 2,
    id,
    revision: 1,
    name: id,
    colors,
    fonts: {},
  };
}

test("legacy CSS colors are normalized when possible and preserved safely otherwise", async () => {
  const normalized = migrateBrandV2(
      brand("legacy-css", {
        blue: "#fff",
        background: "rgb(0, 0, 0)",
      }),
    ),
    release = latestRelease(normalized);
  assert.equal(
    release.objects.find((object) => object.id === "color.primary")?.value,
    "#FFFFFF",
  );
  assert.equal(
    release.objects.find((object) => object.id === "color.background")?.value,
    "#000000",
  );

  const historical = migrateBrandV2(
      brand("legacy-named", { blue: "rebeccapurple" }),
    ),
    primary = latestRelease(historical).objects.find(
      (object) => object.id === "color.primary",
    );
  assert.equal(primary?.value, "rebeccapurple");
  assert.equal(primary?.metadata?.legacyColorUnparsed, "rebeccapurple");
  assert.ok(
    latestRelease(historical).findings.some(
      (finding) =>
        finding.scopeId === "color.primary" && finding.severity === "warning",
    ),
  );

  const store = new BrandConfigurationStore("legacy-css-store", new IDBFactory());
  await store.save(historical, null);
  assert.equal((await store.load("legacy-named"))?.brandId, "legacy-named");
  await store.close();
});

test("imports reject unmarked invalid color tokens before persistence", () => {
  const configuration = migrateBrandV2(brand("invalid-import", { blue: "#123456" })),
    payload = JSON.parse(JSON.stringify(configuration));
  payload.releases[0].objects.find(
    (object: { id: string }) => object.id === "color.primary",
  ).value = "not-a-color";
  assert.throws(
    () => importBrandConfiguration(JSON.stringify(payload)),
    /format #RRGGBB/,
  );
});

test("replacement import cannot orphan a configuration from another brand", async () => {
  const store = new BrandConfigurationStore("cross-brand", new IDBFactory()),
    first = migrateBrandV2(brand("brand-a", { blue: "#123456" })),
    second = migrateBrandV2(brand("brand-b", { blue: "#654321" }));
  await store.save(first, null);
  await assert.rejects(
    store.replaceImported(second),
    /autre marque/,
  );
  assert.equal((await store.load("brand-a"))?.brandId, "brand-a");
  assert.equal(await store.load("brand-b"), null);
  await store.close();
});
