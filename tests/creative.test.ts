import { test } from "node:test";
import assert from "node:assert/strict";
import {
  recipes,
  parseRecipe,
  explore,
  resolveCreative,
} from "../src/domain/creative.js";
test("recipe JSON round-trip retains the same resolved direction", () => {
  for (const recipe of recipes) {
    const restored = parseRecipe(JSON.parse(JSON.stringify(recipe)));
    assert.deepEqual(resolveCreative(restored), resolveCreative(recipe));
  }
});
test("invalid, future and out-of-range recipes are rejected without coercion", () => {
  for (const patch of [
    { recipeVersion: 2 },
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
