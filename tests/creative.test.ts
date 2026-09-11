import { test } from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import {
  campaignDirection,
  recipes,
  parseRecipe,
  explore,
  resolveCreative,
  resolveSupportDirection,
} from "../src/domain/creative.js";
import {
  activate,
  adjustCreativeDirection,
  newCampaign,
  resetCreativeDirection,
  setCreativeDirection,
} from "../src/editor/state.js";
import { agenda, formats } from "../src/editor/catalog.js";
import { IndexedDBCampaignStore } from "../src/storage/indexeddb.js";
test("recipe JSON round-trip retains the same resolved direction", () => {
  for (const recipe of recipes) {
    const restored = parseRecipe(JSON.parse(JSON.stringify(recipe)));
    assert.deepEqual(resolveCreative(restored), resolveCreative(recipe));
  }
});
test("invalid, future and out-of-range recipes are rejected without coercion", () => {
  for (const patch of [
    { recipeVersion: 3 },
    { energy: -1 },
    { density: 101 },
    { scale: NaN },
    { harmony: "__proto__" },
    { name: "" },
    { energy: "50" },
    { unknown: true },
  ]) {
    assert.throws(() => parseRecipe({ ...recipes[0], ...patch }));
  }
});
test("v1 recipes are explicitly migrated to the five-axis v2 contract", () => {
  assert.deepEqual(
    parseRecipe({
      recipeVersion: 1,
      name: "Ancienne recette",
      energy: 20,
      density: 30,
      scale: 40,
      harmony: "plum",
    }),
    {
      recipeVersion: 2,
      name: "Ancienne recette",
      energy: 20,
      colorExpression: 50,
      density: 30,
      scale: 40,
      dominant: "balanced",
      harmony: "plum",
    },
  );
});
test("nearby exploration stays bounded and preserves palette and scale", () => {
  const source = { ...recipes[0], energy: 0, density: 100 };
  const original = structuredClone(source);
  for (const variant of explore(source)) {
    parseRecipe(variant);
    assert.equal(variant.harmony, source.harmony);
    assert.equal(variant.scale, source.scale);
  }
  assert.deepEqual(source, original);
});
test("two formats inherit campaign direction and keep resettable local adjustments", async () => {
  let campaign = newCampaign().campaign;
  campaign.content.events = [
    {
      id: "event-1",
      date: "2026-10-17",
      label: "Concert fictif",
      location: "Ville exemple",
    },
  ];
  campaign = activate(campaign, agenda, formats, "square");
  campaign = activate(campaign, agenda, formats, "story");
  campaign = setCreativeDirection(campaign, {
    ...campaignDirection(campaign),
    energy: 42,
    colorExpression: 73,
  });
  const [square, story] = campaign.supports;
  campaign = adjustCreativeDirection(campaign, square.id, { energy: 18 });
  campaign = adjustCreativeDirection(campaign, story.id, { energy: 91 });
  assert.equal(
    resolveSupportDirection(
      campaign,
      campaign.supports.find((support) => support.id === square.id),
    ).energy,
    18,
  );
  assert.equal(
    resolveSupportDirection(
      campaign,
      campaign.supports.find((support) => support.id === story.id),
    ).energy,
    91,
  );
  assert.equal(campaign.creativeDirection?.energy, 42);
  const restored = JSON.parse(JSON.stringify(campaign));
  assert.deepEqual(restored.creativeDirection, campaign.creativeDirection);
  assert.deepEqual(
    restored.supports.map(
      (support: typeof square) => support.creativeOverrides,
    ),
    campaign.supports.map((support) => support.creativeOverrides),
  );
  const store = new IndexedDBCampaignStore(
    "creative-round-trip",
    new IDBFactory(),
  );
  await store.saveBundle({ campaign, assets: new Map() }, null);
  const reopened = (await store.loadBundle(campaign.id)).campaign;
  assert.deepEqual(reopened.creativeDirection, campaign.creativeDirection);
  assert.deepEqual(
    reopened.supports.map((support) => support.creativeOverrides),
    campaign.supports.map((support) => support.creativeOverrides),
  );
  await store.close();
  campaign = resetCreativeDirection(campaign, square.id);
  assert.equal(
    resolveSupportDirection(campaign, campaign.supports[0]).energy,
    42,
  );
  assert.equal(
    resolveSupportDirection(campaign, campaign.supports[1]).energy,
    91,
  );
});
test("creative direction rejects unsafe values, missing images and undeclared overrides", () => {
  const campaign = newCampaign().campaign;
  assert.throws(
    () =>
      setCreativeDirection(campaign, {
        ...campaignDirection(campaign),
        energy: 101,
      }),
    /invalide/,
  );
  assert.throws(
    () =>
      setCreativeDirection(campaign, {
        ...campaignDirection(campaign),
        dominant: "image",
      }),
    /ressource image/,
  );
  campaign.content.events = [
    {
      id: "event-1",
      date: "2026-10-17",
      label: "Concert fictif",
      location: "Ville exemple",
    },
  ];
  const legacyTemplate = structuredClone(agenda);
  delete (legacyTemplate as Partial<typeof agenda>).creativeCapabilities;
  const withLegacySupport = activate(
    campaign,
    legacyTemplate,
    formats,
    "square",
  );
  assert.throws(
    () =>
      adjustCreativeDirection(
        withLegacySupport,
        withLegacySupport.supports[0].id,
        {
          density: 20,
        },
      ),
    /aucun ajustement/,
  );
});
