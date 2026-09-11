import type { Campaign, Format, Support } from "../src/domain/model.js";
import type { SceneInput } from "../src/render/scene.js";

/** Fictitious events only. Shared by pure layout tests and the browser harness. */
export function sceneFixture(count = 20): SceneInput {
  const format: Format = {
    schemaVersion: 1, id: "test:square", revision: 1, name: "Test carré",
    surface: { width: 600, height: 600, unit: "px" },
    zones: { bleed: { top: 0, right: 0, bottom: 0, left: 0 }, safeInset: { top: 20, right: 20, bottom: 20, left: 20 } },
    exports: [{ id: "png", name: "PNG", type: "raster", area: "surface", mimeType: "image/png", resolution: { mode: "scale", factor: 1 }, background: null }], defaultExportId: "png",
  };
  const editing = { move: true, resize: true, restyle: true, hide: true };
  const placements = [
    { layerId: "title", frame: { x: 30, y: 30, width: 540, height: 110 }, rotation: 0, visible: true,
      style: { fontSize: 60 }, textFit: { mode: "shrink" as const, minFontSize: 20, maxLines: 3 } },
    { layerId: "agenda", frame: { x: 30, y: 180, width: 540, height: 330 }, rotation: 0, visible: true,
      style: { fontSize: 18 }, eventPresentation: { mode: "table" as const, columns: [
        { field: "date" as const, width: 0.2 }, { field: "label" as const, width: 0.45 }, { field: "location" as const, width: 0.35 },
      ], dateFormat: "day-month-year" as const, rowGap: 12, overflow: "paginate" as const, minFontSize: 12, minRowGap: 4 } },
  ];
  const support: Support = {
    id: "support", name: "Test agenda", bindings: { title: "title", events: "events" }, overrides: {}, eventSelections: {},
    template: { schemaVersion: 1, id: "test:agenda", revision: 1, name: "Test agenda", fields: [
      { id: "title", label: "Titre", type: "text", required: true },
      { id: "events", label: "Événements", type: "collection", itemSchema: "core:event@1", required: true, minItems: 1 },
    ], layers: [
      { id: "title", type: "text", content: { field: "title" }, editing, style: { fill: "brand:text" } },
      { id: "agenda", type: "event-list", source: { field: "events" }, editing, style: { fill: "brand:text" } },
    ], layouts: [{ id: "square", formatRef: { id: format.id, revision: 1 }, status: "draft", placements }] },
    variants: [{ id: "square", layoutId: "square", format, placementOverrides: {} }],
  };
  const campaign: Campaign = {
    schemaVersion: 2, id: "test:scene", revision: 1, name: "Campagne fictive", locale: "fr-FR", assets: [],
    content: { title: "CONCERTS FICTIFS", events: Array.from({ length: count }, (_, index) => ({
      id: `event-${index}`, date: "2026-10-24", label: `Concert fictif ${index + 1}`, location: "Ville exemple",
    })) },
    brand: { schemaVersion: 2, id: "test:brand", revision: 1, name: "Identité de test", colors: { text: "#123456" }, fonts: {} },
    supports: [support],
  };
  return { campaign, support, variant: { id: "square", format, placements }, fields: structuredClone(campaign.content) };
}
