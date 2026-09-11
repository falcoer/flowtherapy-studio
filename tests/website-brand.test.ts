import test from "node:test";
import assert from "node:assert/strict";
import { websiteBrand, createWebsiteBrand, createWebsiteBrandCampaign } from "../src/domain/website-brand.js";
import type { Asset } from "../src/domain/model.js";

const resources = (): Asset[] => websiteBrand.resources.map((asset) => ({
  id: asset.id, path: asset.path, mimeType: asset.mimeType,
  sha256: asset.sourceSha256, source: asset.sourcePath, rights: "Test metadata only",
}));

test("website palette tokens match the source CSS, with explicit semantic aliases", () => {
  const light = createWebsiteBrand("light", resources());
  const dark = createWebsiteBrand("dark", resources());
  assert.equal(light.colors.background, "#fbf8f2");
  assert.equal(light.colors.text, "#17171b");
  assert.equal(light.colors.purple, "#7130c8");
  assert.equal(light.colors.orange, "#ed7100");
  assert.equal(light.colors.pink, "#e72f88");
  assert.equal(light.colors.blue, "#168ad5");
  assert.equal(dark.colors.background, "#07101d");
  assert.equal(dark.colors.purple, "#9a48f0");
  assert.equal(dark.colors.orange, "#ff8a00");
  assert.equal(dark.colors.pink, "#ff3b9d");
  assert.equal(dark.colors.blue, "#19a7ef");
  for (const brand of [light, dark]) {
    assert.equal(brand.colors.accent, brand.colors.purple);
    assert.equal(brand.colors.contrast, brand.colors.orange);
    assert.equal(brand.schemaVersion, 2);
    assert.match(brand.description!, /883712401d1a3cdf8961dede819b8ec8cbd7195d/);
  }
});
test("three fonts and the original transparent logo are assigned without invented variants", () => {
  const brand = createWebsiteBrand("light", resources());
  assert.equal(brand.fonts.title.assetId, "flowtherapy-font-bangers");
  assert.equal(brand.fonts.body.assetId, "flowtherapy-font-inter");
  assert.equal(brand.fonts.caption.assetId, "flowtherapy-font-kalam");
  assert.deepEqual(brand.logos?.primary, brand.logos?.light);
  assert.deepEqual(brand.logos?.primary, brand.logos?.dark);
  assert.equal(new Set(resources().map((asset) => asset.id)).size, 4);
});
test("catalogue data and campaign snapshots remain isolated and serialize without loss", () => {
  const assets = resources();
  const first = createWebsiteBrandCampaign("light", assets);
  const second = createWebsiteBrandCampaign("light", assets);
  first.brand!.colors.purple = "#000000";
  first.assets[0].rights = "Modified";
  first.brand!.fonts.title.assetId = "changed";
  assert.equal(second.brand!.colors.purple, "#7130c8");
  assert.equal(websiteBrand.themes.light.colors.purple, "#7130c8");
  assert.equal(assets[0].rights, "Test metadata only");
  assert.equal(second.brand!.fonts.title.assetId, "flowtherapy-font-bangers");
  assert.deepEqual(JSON.parse(JSON.stringify(second)), second);
  assert.deepEqual(second.content, {});
  assert.deepEqual(second.supports, []);
});
test("missing, duplicate and incorrectly typed required resources are rejected", () => {
  assert.throws(() => createWebsiteBrand("light", []), /absente ou incompatible/);
  const wrong = resources();
  wrong[1].mimeType = "image/png";
  assert.throws(() => createWebsiteBrand("light", wrong), /absente ou incompatible/);
  const duplicate = resources();
  duplicate.push({ ...duplicate[0] });
  assert.throws(() => createWebsiteBrand("light", duplicate), /absente ou incompatible/);
});
