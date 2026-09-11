import { test } from "node:test";
import assert from "node:assert/strict";
import { fitText, resolveScene, rotatedBounds, wrapText } from "../src/render/scene.js";
import type { MeasureText } from "../src/render/scene.js";
import { sceneFixture } from "./scene-fixture.js";

const measure: MeasureText = (text, font) => Array.from(text).length * font.size * 0.5;
const allRows = (scene: ReturnType<typeof resolveScene>) => scene.pages.flatMap((page) => page.nodes.flatMap((node) => node.rows ?? []));

test("scene preserves ordered events exactly once across all pages and does not mutate input", () => {
  const input = sceneFixture(), before = structuredClone(input);
  const scene = resolveScene(input, measure);
  assert.ok(scene.pages.length > 1);
  assert.deepEqual(allRows(scene).map((row) => row.id), Array.from({ length: 20 }, (_, i) => `event-${i}`));
  assert.deepEqual(input, before);
  assert.deepEqual(resolveScene(input, measure), scene);
  assert.deepEqual(JSON.parse(JSON.stringify(scene)), scene);
  scene.pages[0].nodes[0].placement.frame.x = 999;
  assert.notEqual(scene.pages[1].nodes[0].placement.frame.x, 999);
  assert.deepEqual(input, before);
});

test("scene uses resolved field order rather than campaign order", () => {
  const input = sceneFixture(3);
  const events = input.fields.events;
  assert.ok(Array.isArray(events));
  input.fields.events = [events[2], events[0]];
  assert.deepEqual(allRows(resolveScene(input, measure)).map((row) => row.id), ["event-2", "event-0"]);
});

test("text wrapping preserves whitespace, explicit blank lines and graphemes", () => {
  const font = { family: "test", size: 10 };
  assert.deepEqual(wrapText("a\n\nb", 100, font, measure), ["a", "", "b"]);
  const text = "hello  world abcdefghijkl";
  assert.equal(wrapText(text, 30, font, measure).join(""), text);
  const graphemes = wrapText("👩‍🎤👩‍🎤", 1, font, measure);
  assert.deepEqual(graphemes, ["👩‍🎤", "👩‍🎤"]);
});

test("text shrink fits measured width, height and maxLines without truncation", () => {
  const text = "UN TITRE ASSEZ LONG";
  const block = fitText(text, { width: 180, height: 60 }, { family: "test", size: 60 }, { mode: "shrink", minFontSize: 12, maxLines: 2 }, measure);
  assert.ok(block.fontSize < 60 && block.fontSize >= 12);
  assert.equal(block.overflow, false);
  assert.equal(block.lines.join(""), text);
  assert.ok(block.height <= 60.001 && block.lines.length <= 2);
});

test("impossible text retains all content at minimum size with a warning", () => {
  const input = sceneFixture(1);
  input.fields.title = "A very long title that must never be silently cut";
  input.variant.placements[0].frame = { x: 30, y: 30, width: 1, height: 1 };
  const scene = resolveScene(input, measure), text = scene.pages[0].nodes[0].text!;
  assert.equal(text.fontSize, 20);
  assert.equal(text.lines.join(""), input.fields.title);
  assert.ok(scene.warnings.some((warning) => warning.code === "text-overflow"));
});

test("brand tokens, implicit title/body roles and explicit fonts are resolved", () => {
  const input = sceneFixture(1);
  input.campaign.brand!.fonts = { title: { assetId: "font-title" }, body: { assetId: "font-body" } };
  input.fontFamilies = { "font-title": "Loaded Title", "font-body": "Loaded Body" };
  const nodes = resolveScene(input, measure).pages[0].nodes;
  assert.equal(nodes[0].fontFamily, "Loaded Title");
  assert.equal(nodes[1].fontFamily, "Loaded Body");
  assert.equal(nodes[0].fill, "#123456");
  input.variant.placements[0].style = { font: "brand:body" };
  assert.equal(resolveScene(input, measure).pages[0].nodes[0].fontFamily, "Loaded Body");
  input.variant.placements[0].style = { font: "serif" };
  assert.equal(resolveScene(input, measure).pages[0].nodes[0].fontFamily, "serif");
});

test("missing font remains usable and produces a substitution warning", () => {
  const input = sceneFixture(1);
  input.campaign.brand!.fonts.title = { assetId: "missing" };
  const scene = resolveScene(input, measure);
  assert.ok(scene.warnings.some((warning) => warning.code === "font-fallback"));
  assert.equal(scene.pages[0].nodes[0].fontFamily, "system-ui, sans-serif");
});

test("oversized event is kept on its own page, never split or dropped", () => {
  const input = sceneFixture(2);
  input.variant.placements[1].frame.height = 1;
  const scene = resolveScene(input, measure);
  assert.equal(scene.pages.length, 2);
  assert.deepEqual(allRows(scene).map((row) => row.id), ["event-0", "event-1"]);
  assert.equal(scene.warnings.filter((warning) => warning.code.startsWith("event-overflow:")).length, 2);
});

test("compact mode reduces typography and spacing while preserving all events", () => {
  const input = sceneFixture(8), placement = input.variant.placements[1];
  placement.eventPresentation!.overflow = "compact";
  placement.frame.height = 180;
  const scene = resolveScene(input, measure), node = scene.pages[0].nodes[1];
  assert.equal(scene.pages.length, 1);
  assert.equal(node.rows!.length, 8);
  assert.ok(node.fontSize < 18 && node.fontSize >= 12);
  assert.ok(!scene.warnings.some((warning) => warning.code === "events-overflow"));
});

test("error and failed compact modes report overflow without losing rows", () => {
  for (const mode of ["error", "compact"] as const) {
    const input = sceneFixture(20);
    input.variant.placements[1].eventPresentation!.overflow = mode;
    input.variant.placements[1].frame.height = 1;
    const scene = resolveScene(input, measure);
    assert.equal(scene.pages.length, 1);
    assert.equal(allRows(scene).length, 20);
    assert.ok(scene.warnings.some((warning) => warning.code === "events-overflow"));
  }
});

test("cards stack all fields and civil dates are timezone independent", () => {
  const input = sceneFixture(1);
  input.variant.placements[1].eventPresentation!.mode = "cards";
  input.variant.placements[1].eventPresentation!.dateFormat = "day-month";
  const cells = allRows(resolveScene(input, measure))[0].cells;
  assert.equal(cells[0].text.text, "24/10");
  assert.deepEqual(cells.map((cell) => cell.field), ["date", "label", "location"]);
  assert.ok(cells[1].frame.y > cells[0].frame.y && cells[2].frame.y > cells[1].frame.y);
});

test("safety checks include rotations, excluded zones, and hidden layers", () => {
  const bounds = rotatedBounds({ x: 10, y: 10, width: 100, height: 20 }, 90);
  assert.ok(Math.abs(bounds.width - 20) < 0.001 && Math.abs(bounds.height - 100) < 0.001);
  const input = sceneFixture(1);
  input.variant.placements[0].frame.x = 0;
  input.variant.placements[0].rotation = 30;
  input.variant.format.zones.exclusions = [{ id: "ui", label: "Interface", x: 0, y: 0, width: 600, height: 150 }];
  let scene = resolveScene(input, measure);
  assert.ok(scene.warnings.some((warning) => warning.code === "surface"));
  assert.ok(scene.warnings.some((warning) => warning.code === "safe-area"));
  assert.ok(scene.warnings.some((warning) => warning.code === "exclusion:ui"));
  input.variant.placements[0].visible = false;
  scene = resolveScene(input, measure);
  assert.ok(!scene.warnings.some((warning) => warning.layerId === "title"));
});

test("logical coordinates yield identical pagination when converted from px to mm", () => {
  const input = sceneFixture(), initial = resolveScene(input, measure), scaled = structuredClone(input);
  const factor = 0.35;
  const format = scaled.variant.format;
  format.surface = { width: 210, height: 210, unit: "mm" };
  for (const key of ["top", "left", "right", "bottom"] as const) format.zones.safeInset[key] *= factor;
  for (const placement of scaled.variant.placements) {
    for (const key of ["x", "y", "width", "height"] as const) placement.frame[key] *= factor;
    placement.style!.fontSize! *= factor;
    if (placement.textFit) placement.textFit.minFontSize *= factor;
    if (placement.eventPresentation) {
      placement.eventPresentation.minFontSize *= factor;
      placement.eventPresentation.rowGap *= factor;
      placement.eventPresentation.minRowGap *= factor;
    }
  }
  const scene = resolveScene(scaled, measure);
  assert.equal(scene.pages.length, initial.pages.length);
  assert.deepEqual(scene.pages.map((page) => page.nodes[1].rows!.map((row) => row.id)), initial.pages.map((page) => page.nodes[1].rows!.map((row) => row.id)));
});

test("shapes and hidden paginated layers preserve scene JSON round trips", () => {
  const input = sceneFixture(2);
  input.variant.placements[1].visible = false;
  input.support.template.layers.push({ id: "background", type: "shape", shape: "rectangle", editing: { move: false, resize: false, restyle: false, hide: false } });
  input.variant.placements.unshift({ layerId: "background", frame: { x: 0, y: 0, width: 600, height: 600 }, rotation: 0, visible: true });
  const scene = resolveScene(input, measure);
  assert.equal(scene.pages.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(scene)), scene);
  assert.equal(allRows(scene).length, 0);
});

test("a literal font never inherits a missing brand font warning", () => {
  const input = sceneFixture(1);
  input.campaign.brand!.fonts.title = { assetId: "missing" };
  input.variant.placements[0].style = { font: "serif" };
  assert.ok(!resolveScene(input, measure).warnings.some((warning) => warning.code === "font-fallback"));
});
