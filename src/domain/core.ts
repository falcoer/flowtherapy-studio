import { Ajv } from "ajv";
import schema from "../../schemas/domain.schema.json" with { type: "json" };
import {
  resolveSupportDirection,
  supportedOverrides,
  validateCreativeDirection,
} from "./creative.js";
import type {
  Campaign,
  EventRow,
  Field,
  Format,
  Placement,
  Ref,
  Support,
  Template,
  Value,
  Variant,
} from "./model.js";

export class DomainError extends Error {
  constructor(
    public code: string,
    public path: string,
    message: string,
  ) {
    super(`${path}: ${message}`);
    this.name = "DomainError";
  }
}
export function requireThat(
  condition: unknown,
  path: string,
  message: string,
  code = "INVALID_DOCUMENT",
): asserts condition {
  if (!condition) throw new DomainError(code, path, message);
}
const own = (value: object, key: string) => Object.hasOwn(value, key);
const clone = <T>(value: T): T => structuredClone(value);
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(schema, "domain");
export function validateStructure(kind: string, value: unknown): void {
  const validate = ajv.getSchema(`domain#/definitions/${kind}`);
  requireThat(validate, "$", `Unknown contract ${kind}`);
  // JSON-only data: never silently discard undefined, non-finite numbers or executable values.
  const visit = (v: unknown, path: string, seen: Set<object>) => {
    requireThat(
      v !== undefined &&
        typeof v !== "function" &&
        typeof v !== "symbol" &&
        typeof v !== "bigint",
      path,
      "Not a JSON value",
    );
    if (typeof v === "number")
      requireThat(Number.isFinite(v), path, "Non-finite number");
    if (v && typeof v === "object") {
      requireThat(!seen.has(v), path, "Cyclic document");
      requireThat(
        Array.isArray(v) ||
          Object.getPrototypeOf(v) === Object.prototype ||
          Object.getPrototypeOf(v) === null,
        path,
        "Not a plain JSON object",
      );
      requireThat(seen.size < 64, path, "Document nesting exceeds 64 levels");
      seen.add(v);
      for (const [k, child] of Object.entries(v)) {
        requireThat(
          !["__proto__", "prototype", "constructor"].includes(k),
          path,
          "Reserved key",
        );
        visit(child, `${path}/${k}`, seen);
      }
      seen.delete(v);
    }
  };
  visit(value, "$", new Set());
  requireThat(validate(value), "$", ajv.errorsText(validate.errors), "SCHEMA");
}
function unique(values: string[], path: string) {
  requireThat(
    values.every((v) => v.trim().length > 0) &&
      new Set(values).size === values.length,
    path,
    "Empty or duplicate identifier",
  );
}
function reference(ref: Ref, path: string) {
  requireThat(
    ref.id.trim() && Number.isSafeInteger(ref.revision) && ref.revision >= 1,
    path,
    "Invalid reference/revision",
  );
}
export function isCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <=
      [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  );
}
export function safeAssetPath(path: string): boolean {
  return (
    /^assets\/[A-Za-z0-9_./-]+$/.test(path) &&
    path.split("/").every((p) => p !== "" && p !== "." && p !== "..")
  );
}
function rows(value: EventRow[], path: string) {
  unique(
    value.map((v) => v.id),
    path,
  );
  for (const event of value)
    requireThat(
      isCivilDate(event.date) && event.label.trim() && event.location.trim(),
      path,
      `Invalid event ${event.id}`,
    );
}
function checkValue(value: Value, path: string, assetIds?: Set<string>) {
  if (Array.isArray(value)) rows(value, path);
  else if (typeof value === "object" && assetIds)
    requireThat(
      assetIds.has(value.assetId),
      path,
      `Missing asset ${value.assetId}`,
      "REFERENCE",
    );
}
function fieldValue(field: Field, value: Value, path: string) {
  requireThat(
    field.type === "collection"
      ? Array.isArray(value)
      : field.type === "image"
        ? typeof value === "object" && !Array.isArray(value)
        : typeof value === "string",
    path,
    "Field type mismatch",
  );
  if (field.type === "date")
    requireThat(isCivilDate(value as string), path, "Invalid civil date");
  if (field.type === "url") {
    let valid = false;
    try {
      valid = ["http:", "https:"].includes(new URL(value as string).protocol);
    } catch {
      /* invalid */
    }
    requireThat(valid, path, "Expected absolute HTTP(S) URL");
  }
  if (field.type === "collection") {
    rows(value as EventRow[], path);
    requireThat(
      (value as EventRow[]).length >= field.minItems,
      path,
      "Collection below minItems",
    );
  }
}
function geometry(p: Partial<Placement>, path: string) {
  if (p.frame)
    requireThat(
      p.frame.width > 0 && p.frame.height > 0,
      path,
      "Frame must have positive dimensions",
    );
  if (p.style?.fontSize !== undefined)
    requireThat(p.style.fontSize > 0, path, "Invalid font size");
  if (p.imageFit)
    requireThat(
      [p.imageFit.focalX, p.imageFit.focalY].every((v) => v >= 0 && v <= 1),
      path,
      "Invalid focal point",
    );
  if (p.textFit)
    requireThat(
      p.textFit.minFontSize > 0 &&
        Number.isSafeInteger(p.textFit.maxLines) &&
        p.textFit.maxLines >= 1,
      path,
      "Invalid text fit",
    );
  if (p.eventPresentation) {
    const e = p.eventPresentation;
    unique(
      e.columns.map((c) => c.field),
      path,
    );
    requireThat(
      e.columns.length &&
        e.columns.every((c) => c.width > 0) &&
        Math.abs(e.columns.reduce((s, c) => s + c.width, 0) - 1) < 1e-9,
      path,
      "Column fractions must sum to 1",
    );
    requireThat(
      e.minFontSize > 0 && e.minRowGap >= 0 && e.rowGap >= e.minRowGap,
      path,
      "Invalid event spacing",
    );
  }
}
export function validateFormat(input: unknown): asserts input is Format {
  validateStructure("Format", input);
  const f = input as Format;
  reference(f, "format");
  if (f.derivedFrom) reference(f.derivedFrom, "format.derivedFrom");
  requireThat(
    f.surface.width > 0 && f.surface.height > 0,
    "surface",
    "Invalid dimensions",
  );
  for (const inset of [f.zones.bleed, f.zones.safeInset])
    requireThat(
      Object.values(inset).every((n) => n >= 0),
      "zones",
      "Negative inset",
    );
  const s = f.zones.safeInset;
  requireThat(
    s.left + s.right < f.surface.width && s.top + s.bottom < f.surface.height,
    "safeInset",
    "No safe surface",
  );
  if (f.zones.exclusions) {
    unique(
      f.zones.exclusions.map((x) => x.id),
      "exclusions",
    );
    for (const frame of f.zones.exclusions) geometry({ frame }, "exclusions");
  }
  unique(
    f.exports.map((e) => e.id),
    "exports",
  );
  requireThat(
    f.exports.some((e) => e.id === f.defaultExportId),
    "defaultExportId",
    "Missing preset",
  );
  for (const e of f.exports) {
    if (e.type === "pdf")
      requireThat(
        f.surface.unit === "mm" && e.rasterDpi > 0 && !!e.background,
        e.id,
        "PDF requires mm and positive DPI",
      );
    else {
      requireThat(
        e.resolution.mode === (f.surface.unit === "px" ? "scale" : "dpi"),
        e.id,
        "Resolution unit mismatch",
      );
      requireThat(
        (e.resolution.mode === "scale"
          ? e.resolution.factor
          : e.resolution.value) > 0,
        e.id,
        "Invalid resolution",
      );
      requireThat(
        e.mimeType !== "image/jpeg" || !!e.background,
        e.id,
        "JPEG needs background",
      );
      requireThat(
        e.quality === undefined || (e.quality > 0 && e.quality <= 1),
        e.id,
        "Invalid quality",
      );
    }
  }
}
export function validateTemplate(input: unknown): asserts input is Template {
  validateStructure("Template", input);
  const t = input as Template;
  reference(t, "template");
  if (t.derivedFrom) reference(t.derivedFrom, "derivedFrom");
  if (t.brandRef) reference(t.brandRef, "brandRef");
  if (t.creativeCapabilities) {
    unique(t.creativeCapabilities.axes, "creativeCapabilities.axes");
    unique(t.creativeCapabilities.dominants, "creativeCapabilities.dominants");
  }
  unique(
    t.fields.map((f) => f.id),
    "fields",
  );
  unique(
    t.layers.map((l) => l.id),
    "layers",
  );
  unique(
    t.layouts.map((l) => l.id),
    "layouts",
  );
  for (const f of t.fields) {
    if (f.type === "collection")
      requireThat(
        Number.isSafeInteger(f.minItems) && f.minItems >= 0,
        f.id,
        "Invalid minItems",
      );
    else if (f.defaultValue !== undefined) fieldValue(f, f.defaultValue, f.id);
  }
  for (const layer of t.layers) {
    geometry({ style: layer.style }, layer.id);
    const source =
      "source" in layer
        ? layer.source
        : "content" in layer
          ? layer.content
          : undefined;
    if (source && "field" in source) {
      const f = t.fields.find((f) => f.id === source.field);
      requireThat(f, layer.id, "Unknown source field", "REFERENCE");
      requireThat(
        layer.type === "event-list"
          ? f.type === "collection"
          : ["image", "vector"].includes(layer.type)
            ? f.type === "image"
            : !["collection", "image"].includes(f.type),
        layer.id,
        "Layer source type mismatch",
      );
    } else if (source && "value" in source) {
      const v = source.value;
      requireThat(
        ["image", "vector"].includes(layer.type)
          ? typeof v === "object" && !Array.isArray(v)
          : typeof v === "string",
        layer.id,
        "Layer constant type mismatch",
      );
    }
  }
  for (const layout of t.layouts) {
    reference(layout.formatRef, layout.id);
    unique(
      layout.placements.map((p) => p.layerId),
      layout.id,
    );
    requireThat(
      layout.placements.length === t.layers.length,
      layout.id,
      "Every layer needs a placement",
    );
    let paginated = 0;
    for (const p of layout.placements) {
      const layer = t.layers.find((l) => l.id === p.layerId);
      requireThat(layer, p.layerId, "Unknown layer", "REFERENCE");
      geometry(p, p.layerId);
      requireThat(
        (layer.type === "event-list") === !!p.eventPresentation,
        p.layerId,
        "Event presentation mismatch",
      );
      if (p.eventPresentation?.overflow === "paginate") paginated++;
    }
    requireThat(
      paginated <= 1,
      layout.id,
      "Only one paginated collection per layout",
    );
  }
}
export function selectEvents(
  events: EventRow[],
  selection: Support["eventSelections"][string],
): EventRow[] {
  requireThat(Array.isArray(events), "events", "Expected event collection");
  for (const event of events) validateStructure("EventRow", event);
  rows(events, "events");
  validateStructure("EventSelection", selection);
  if (selection.mode === "all") return clone(events);
  unique(selection.ids, "selection");
  return selection.ids.map((id) => {
    const row = events.find((e) => e.id === id);
    requireThat(row, "selection", `Missing event ${id}`, "REFERENCE");
    return clone(row);
  });
}
function resolveFields(c: Campaign, s: Support): Record<string, Value> {
  const result: Record<string, Value> = Object.create(null);
  for (const key of [
    ...Object.keys(s.bindings),
    ...Object.keys(s.overrides),
    ...Object.keys(s.eventSelections),
  ])
    requireThat(
      s.template.fields.some((f) => f.id === key),
      key,
      "Unknown field",
      "REFERENCE",
    );
  for (const f of s.template.fields) {
    if (own(s.bindings, f.id))
      requireThat(
        own(c.content, s.bindings[f.id]),
        f.id,
        "Deleted bound content",
        "REFERENCE",
      );
    let value = own(s.overrides, f.id)
      ? s.overrides[f.id]
      : own(s.bindings, f.id)
        ? c.content[s.bindings[f.id]]
        : "defaultValue" in f
          ? f.defaultValue
          : undefined;
    if (own(s.eventSelections, f.id))
      requireThat(
        f.type === "collection",
        f.id,
        "Selection requires a collection",
      );
    if (value === undefined) {
      requireThat(
        !f.required && !own(s.eventSelections, f.id),
        f.id,
        "Required field missing",
      );
      continue;
    }
    fieldValue(f, value, f.id);
    if (f.type === "collection" && own(s.eventSelections, f.id))
      value = selectEvents(value as EventRow[], s.eventSelections[f.id]);
    fieldValue(f, value, f.id);
    result[f.id] = clone(value);
  }
  return result;
}
export function resolvePlacements(s: Support, v: Variant): Placement[] {
  const layout = s.template.layouts.find((l) => l.id === v.layoutId);
  requireThat(layout, v.id, "Missing layout", "REFERENCE");
  for (const key of Object.keys(v.placementOverrides))
    requireThat(
      layout.placements.some((p) => p.layerId === key),
      key,
      "Unknown overridden placement",
      "REFERENCE",
    );
  const placements = layout.placements.map((p) => ({
    ...clone(p),
    ...clone(v.placementOverrides[p.layerId] ?? {}),
  }));
  for (const p of placements) {
    geometry(p, p.layerId);
    const layer = s.template.layers.find((l) => l.id === p.layerId);
    requireThat(
      (layer?.type === "event-list") === !!p.eventPresentation,
      p.layerId,
      "Event presentation mismatch",
    );
  }
  requireThat(
    placements.filter((p) => p.eventPresentation?.overflow === "paginate")
      .length <= 1,
    v.id,
    "Only one paginated collection",
  );
  return placements;
}
export function validateCampaign(input: unknown): asserts input is Campaign {
  validateStructure("Campaign", input);
  const c = input as Campaign;
  reference(c, "campaign");
  try {
    new Intl.Locale(c.locale);
  } catch {
    throw new DomainError("INVALID_DOCUMENT", "locale", "Invalid locale");
  }
  unique(
    c.assets.map((a) => a.id),
    "assets",
  );
  unique(
    c.assets.map((a) => a.path),
    "asset paths",
  );
  unique(
    c.supports.map((s) => s.id),
    "supports",
  );
  const assetIds = new Set(c.assets.map((a) => a.id));
  for (const a of c.assets)
    requireThat(
      safeAssetPath(a.path) &&
        /^[a-f0-9]{64}$/.test(a.sha256) &&
        a.source.trim() &&
        a.rights.trim(),
      a.id,
      "Unsafe asset path, hash or missing provenance",
    );
  for (const [key, v] of Object.entries(c.content))
    checkValue(v, key, assetIds);
  if (c.creativeDirection) validateCreativeDirection(c.creativeDirection, c);
  if (c.brand) {
    reference(c.brand, "brand");
    if (c.brand.derivedFrom)
      reference(c.brand.derivedFrom, "brand.derivedFrom");
    for (const ref of Object.values(c.brand.fonts))
      checkValue(ref, "brand.fonts", assetIds);
  }
  const checkStyle = (style: Placement["style"]) => {
    for (const key of ["fill", "font"] as const) {
      const value = style?.[key];
      if (value?.startsWith("brand:"))
        requireThat(
          c.brand &&
            own(
              key === "fill" ? c.brand.colors : c.brand.fonts,
              value.slice(6),
            ),
          "style",
          `Missing brand token ${value}`,
          "REFERENCE",
        );
    }
  };
  for (const s of c.supports) {
    validateTemplate(s.template);
    if (s.creativeOverrides) {
      supportedOverrides(s, s.creativeOverrides);
      validateCreativeDirection(resolveSupportDirection(c, s), c);
    }
    if (s.template.brandRef)
      requireThat(
        c.brand?.id === s.template.brandRef.id &&
          c.brand?.revision === s.template.brandRef.revision,
        s.id,
        "Brand snapshot mismatch",
        "REFERENCE",
      );
    for (const f of s.template.fields)
      if ("defaultValue" in f && f.defaultValue !== undefined)
        checkValue(f.defaultValue, f.id, assetIds);
    for (const layer of s.template.layers) {
      checkStyle(layer.style);
      if ("content" in layer && "value" in layer.content)
        checkValue(layer.content.value, layer.id, assetIds);
    }
    for (const layout of s.template.layouts)
      for (const p of layout.placements) checkStyle(p.style);
    for (const [key, value] of Object.entries(s.overrides))
      checkValue(value, key, assetIds);
    resolveFields(c, s);
    unique(
      s.variants.map((v) => v.id),
      s.id,
    );
    for (const v of s.variants) {
      validateFormat(v.format);
      const layout = s.template.layouts.find((l) => l.id === v.layoutId);
      requireThat(
        layout &&
          layout.formatRef.id === v.format.id &&
          layout.formatRef.revision === v.format.revision,
        v.id,
        "Format snapshot mismatch",
        "REFERENCE",
      );
      for (const p of resolvePlacements(s, v)) checkStyle(p.style);
    }
  }
}
export function resolveSupport(campaign: Campaign, supportId: string) {
  validateCampaign(campaign);
  const support = campaign.supports.find((s) => s.id === supportId);
  requireThat(support, supportId, "Missing support", "REFERENCE");
  return {
    fields: resolveFields(campaign, support),
    variants: support.variants.map((v) => ({
      id: v.id,
      format: clone(v.format),
      placements: resolvePlacements(support, v),
    })),
  };
}
/** Detached, recursively frozen snapshot; does not look up or merge a catalogue. */
export function snapshotCampaign(input: unknown): Readonly<Campaign> {
  validateCampaign(input);
  const freeze = <T>(v: T): T => {
    if (v && typeof v === "object") {
      Object.values(v).forEach(freeze);
      Object.freeze(v);
    }
    return v;
  };
  return freeze(clone(input));
}
/** Only explicitly requested layouts become active; catalogue objects are copied. */
export function createSupport(options: {
  id: string;
  name: string;
  template: Template;
  formats: Format[];
  layoutIds: string[];
  bindings?: Support["bindings"];
}): Support {
  validateTemplate(options.template);
  unique(options.layoutIds, "layoutIds");
  const variants = options.layoutIds.map((layoutId) => {
    const layout = options.template.layouts.find((l) => l.id === layoutId);
    requireThat(layout, layoutId, "Missing layout", "REFERENCE");
    const matches = options.formats.filter(
      (f) =>
        f.id === layout.formatRef.id &&
        f.revision === layout.formatRef.revision,
    );
    requireThat(
      matches.length === 1,
      layoutId,
      "Missing or ambiguous format revision",
      "REFERENCE",
    );
    validateFormat(matches[0]);
    return {
      id: `${options.id}:${layoutId}`,
      layoutId,
      format: clone(matches[0]),
      placementOverrides: {},
    };
  });
  return {
    id: options.id,
    name: options.name,
    template: clone(options.template),
    bindings: clone(options.bindings ?? {}),
    overrides: {},
    eventSelections: {},
    variants,
  };
}
