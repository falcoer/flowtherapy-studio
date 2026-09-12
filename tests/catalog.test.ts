import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSupport, validateTemplate } from "../src/domain/core.js";
import type { Format, Template } from "../src/domain/model.js";

const read = (path: string) =>
  JSON.parse(readFileSync(new URL("../" + path, import.meta.url), "utf8"));

test("concert illustrated template validates in every declared format", () => {
  const template = read("catalog/templates/concert-illustrated.json") as Template;
  const formats = ["square", "portrait", "story", "a4", "a3"].map(
    (name) => read(`catalog/formats/${name}.json`) as Format,
  );

  validateTemplate(template);
  const support = createSupport({
    id: "test:concert-illustrated",
    name: template.name,
    template,
    formats,
    layoutIds: template.layouts.map((layout) => layout.id),
  });

  assert.equal(support.variants.length, 5);
  assert.deepEqual(
    support.variants.map((variant) => variant.format.id),
    formats.map((format) => format.id),
  );
  assert.equal(template.layers.filter((layer) => layer.type === "image").length, 4);
  assert.equal(template.layers.filter((layer) => layer.type === "event-list").length, 1);
});
