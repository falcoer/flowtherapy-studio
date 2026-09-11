import type {
  Campaign, EventRow, Format, Frame, Layer, Placement, Support, Value,
} from "../domain/model.js";

/** Browser-independent layout. The caller supplies measurements from loaded fonts.
 * All coordinates (including font sizes) use the format's logical unit.
 * The returned scene contains no DOM nodes, callbacks or mutable campaign objects.
 */
export interface FontSpec { family: string; size: number }
export type MeasureText = (text: string, font: FontSpec) => number;
export interface TextBlock {
  text: string;
  lines: string[];
  fontSize: number;
  lineHeight: number;
  height: number;
  overflow: boolean;
}
export interface EventCell { field: "date" | "label" | "location"; frame: Frame; text: TextBlock }
export interface SceneRow { id: string; y: number; height: number; cells: EventCell[] }
export interface SceneNode {
  id: string;
  layer: Layer;
  placement: Placement;
  value?: Value;
  fill: string;
  fontFamily: string;
  fontSize: number;
  text?: TextBlock;
  rows?: SceneRow[];
}
export interface SceneWarning { layerId: string; code: string; message: string }
export interface ResolvedScene {
  sceneVersion: 1;
  format: Format;
  pages: Array<{ number: number; nodes: SceneNode[] }>;
  warnings: SceneWarning[];
}
export interface SceneInput {
  campaign: Campaign;
  support: Support;
  variant: { id: string; format: Format; placements: Placement[] };
  fields: Record<string, Value>;
  /** Keys are campaign asset IDs, not font names or brand roles. */
  fontFamilies?: Record<string, string>;
}
const EPSILON = 0.001;
const FALLBACK = "system-ui, sans-serif";
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Wrap at words, breaking long tokens only at grapheme boundaries. Preserve
 * whitespace and the original text: overflow is reported, never truncated. */
export function wrapText(text: string, width: number, font: FontSpec, measure: MeasureText): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    // NBSP remains part of a word; ordinary spaces and tabs are retained.
    const tokens = paragraph.match(/[^ \t]+|[ \t]+/gu) ?? [];
    for (const token of tokens) {
      if (measure(line + token, font) <= width + EPSILON) {
        line += token;
        continue;
      }
      if (line) { lines.push(line); line = ""; }
      if (measure(token, font) <= width + EPSILON) {
        line = token;
        continue;
      }
      for (const { segment } of segmenter.segment(token)) {
        if (line && measure(line + segment, font) > width + EPSILON) {
          lines.push(line);
          line = "";
        }
        line += segment;
      }
    }
    lines.push(line);
  }
  return lines;
}

export function fitText(
  text: string, frame: Pick<Frame, "width" | "height">, font: FontSpec,
  fit: Placement["textFit"], measure: MeasureText,
): TextBlock {
  const at = (size: number): TextBlock => {
    const f = { ...font, size };
    const lines = wrapText(text, frame.width, f, measure);
    const lineHeight = size * 1.2;
    const height = lines.length * lineHeight;
    return {
      text, lines, fontSize: size, lineHeight, height,
      overflow: height > frame.height + EPSILON ||
        lines.length > (fit?.maxLines ?? Infinity) ||
        lines.some((line) => measure(line, f) > frame.width + EPSILON),
    };
  };
  const original = at(font.size);
  if (!original.overflow || fit?.mode !== "shrink") return original;
  let low = Math.min(font.size, fit.minFontSize), high = font.size;
  let best = at(low);
  if (best.overflow) return best;
  for (let i = 0; i < 18; i++) {
    const mid = (low + high) / 2, candidate = at(mid);
    if (candidate.overflow) high = mid;
    else { low = mid; best = candidate; }
  }
  return best;
}

function valueOf(layer: Layer, fields: Record<string, Value>): Value | undefined {
  if ("source" in layer) return fields[layer.source.field];
  if ("content" in layer) return "field" in layer.content ? fields[layer.content.field] : layer.content.value;
}
function civilDate(date: string, short: boolean): string {
  const [year, month, day] = date.split("-");
  return short ? `${day}/${month}` : `${day}/${month}/${year}`;
}
/** Axis-aligned bounds of the rotated frame, about its centre. */
export function rotatedBounds(frame: Frame, degrees: number): Frame {
  const angle = degrees * Math.PI / 180;
  const width = Math.abs(Math.cos(angle)) * frame.width + Math.abs(Math.sin(angle)) * frame.height;
  const height = Math.abs(Math.sin(angle)) * frame.width + Math.abs(Math.cos(angle)) * frame.height;
  return { x: frame.x + (frame.width - width) / 2, y: frame.y + (frame.height - height) / 2, width, height };
}
function inside(a: Frame, b: Frame): boolean {
  return a.x >= b.x - EPSILON && a.y >= b.y - EPSILON &&
    a.x + a.width <= b.x + b.width + EPSILON && a.y + a.height <= b.y + b.height + EPSILON;
}
function overlaps(a: Frame, b: Frame): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function eventRows(events: EventRow[], node: SceneNode, size: number, gap: number, measure: MeasureText): SceneRow[] {
  const presentation = node.placement.eventPresentation!;
  const columns = presentation.columns;
  const stacked = presentation.mode === "cards";
  const gutter = size * 0.25;
  const available = Math.max(0, node.placement.frame.width - (stacked ? 0 : gutter * (columns.length - 1)));
  const total = columns.reduce((sum, col) => sum + col.width, 0);
  let y = 0;
  return events.map((event) => {
    let x = 0, cellY = 0;
    const cells = columns.map((column): EventCell => {
      const width = stacked ? available : available * column.width / total;
      const value = column.field === "date" ? civilDate(event.date, presentation.dateFormat === "day-month") : event[column.field];
      const text = fitText(value, { width, height: Infinity }, { family: node.fontFamily, size }, undefined, measure);
      const cell = { field: column.field, frame: { x, y: cellY, width, height: text.height }, text };
      if (stacked) cellY += text.height + gutter;
      else x += width + gutter;
      return cell;
    });
    const height = stacked ? Math.max(0, cellY - gutter) : Math.max(0, ...cells.map((cell) => cell.text.height));
    const row = { id: event.id, y, height, cells };
    y += height + gap;
    return row;
  });
}
function rowsHeight(rows: SceneRow[]): number {
  const last = rows.at(-1);
  return last ? last.y + last.height : 0;
}

export function resolveScene(input: SceneInput, measure: MeasureText): ResolvedScene {
  const { campaign, support, variant, fields, fontFamilies = {} } = input;
  const warnings: SceneWarning[] = [];
  const warn = (layerId: string, code: string, message: string) => warnings.push({ layerId, code, message });
  const nodes: SceneNode[] = [];
  let paginatedId: string | undefined;
  let rowPages: SceneRow[][] = [[]];
  const { width, height } = variant.format.surface;
  const inset = variant.format.zones.safeInset;
  const safe = { x: inset.left, y: inset.top, width: width - inset.left - inset.right, height: height - inset.top - inset.bottom };

  for (const placement of variant.placements) {
    if (!placement.visible) continue;
    const layer = support.template.layers.find((item) => item.id === placement.layerId);
    if (!layer) throw new Error(`Calque inconnu : ${placement.layerId}`);
    const style = { ...layer.style, ...placement.style };
    const role = style.font?.startsWith("brand:") ? style.font.slice(6) : layer.id === "title" ? "title" : "body";
    const fontAssetId = campaign.brand?.fonts[role]?.assetId;
    const fontFamily = style.font && !style.font.startsWith("brand:") ? style.font :
      (fontAssetId && fontFamilies[fontAssetId]) || FALLBACK;
    if (["text", "event-list"].includes(layer.type) && (!style.font || style.font.startsWith("brand:")) && fontAssetId && !fontFamilies[fontAssetId])
      warn(layer.id, "font-fallback", `Police « ${role} » indisponible ou en chargement ; substitution temporaire.`);
    const fill = style.fill?.startsWith("brand:") ? campaign.brand?.colors[style.fill.slice(6)] : style.fill;
    const value = valueOf(layer, fields);
    const node: SceneNode = {
      id: layer.id, layer: structuredClone(layer), placement: structuredClone(placement),
      ...(value === undefined ? {} : { value: structuredClone(value) }), fill: fill ?? "#173943",
      fontFamily, fontSize: style.fontSize ?? width * 0.03,
    };
    const bounds = rotatedBounds(placement.frame, placement.rotation);
    if (!inside(bounds, { x: 0, y: 0, width, height }))
      warn(layer.id, "surface", "Le cadre dépasse la surface, rotation comprise.");
    if (["text", "event-list", "qr"].includes(layer.type)) {
      if (!inside(bounds, safe)) warn(layer.id, "safe-area", "Le cadre empiète sur la marge de sécurité.");
      for (const exclusion of variant.format.zones.exclusions ?? [])
        if (overlaps(bounds, exclusion)) warn(layer.id, `exclusion:${exclusion.id}`, `Vérifier le chevauchement avec la zone « ${exclusion.label} ».`);
    }
    if (layer.type === "text" && typeof node.value === "string") {
      node.text = fitText(node.value, placement.frame, { family: fontFamily, size: node.fontSize }, placement.textFit, measure);
      node.fontSize = node.text.fontSize;
      if (node.text.overflow) warn(layer.id, "text-overflow", "Texte trop grand même après ajustement : contenu intégral conservé. Agrandir le cadre.");
    }
    if (layer.type === "event-list" && Array.isArray(node.value)) {
      const presentation = placement.eventPresentation;
      if (!presentation) throw new Error(`Présentation des événements absente : ${layer.id}`);
      let gap = presentation.rowGap;
      let rows = eventRows(node.value, node, node.fontSize, gap, measure);
      if (presentation.overflow === "compact" && rowsHeight(rows) > placement.frame.height + EPSILON) {
        const baseSize = node.fontSize, baseGap = gap;
        const minSize = Math.min(baseSize, presentation.minFontSize), minGap = Math.min(baseGap, presentation.minRowGap);
        let low = 0, high = 1;
        node.fontSize = minSize; gap = minGap;
        rows = eventRows(node.value, node, minSize, minGap, measure);
        if (rowsHeight(rows) <= placement.frame.height + EPSILON) {
          for (let i = 0; i < 18; i++) {
            const factor = (low + high) / 2;
            const size = minSize + (baseSize - minSize) * factor;
            const candidateGap = minGap + (baseGap - minGap) * factor;
            const candidate = eventRows(node.value, node, size, candidateGap, measure);
            if (rowsHeight(candidate) > placement.frame.height + EPSILON) high = factor;
            else { low = factor; rows = candidate; node.fontSize = size; gap = candidateGap; }
          }
        }
      }
      if (rows.some((row) => row.cells.some((cell) => cell.text.overflow)))
        warn(layer.id, "cell-overflow", "Une cellule dépasse sa largeur ; texte conservé sans coupure.");
      if (presentation.overflow === "paginate") {
        if (paginatedId) throw new Error("Une seule collection paginée est autorisée par scène.");
        paginatedId = layer.id;
        rowPages = [[]];
        let pageY = 0;
        for (const row of rows) {
          if (rowPages.at(-1)!.length && pageY + row.height > placement.frame.height + EPSILON) {
            rowPages.push([]); pageY = 0;
          }
          rowPages.at(-1)!.push({ ...row, y: pageY });
          if (row.height > placement.frame.height + EPSILON)
            warn(layer.id, `event-overflow:${row.id}`, `L’événement « ${row.id} » dépasse une page à lui seul ; il est conservé intégralement.`);
          pageY += row.height + gap;
        }
      } else if (rowsHeight(rows) > placement.frame.height + EPSILON) {
        warn(layer.id, "events-overflow", "La liste dépasse le cadre ; tous les événements sont conservés. Agrandir le cadre ou choisir la pagination.");
      }
      node.rows = rows;
    }
    if (layer.type === "qr" || layer.type === "vector") warn(layer.id, "unsupported", `Aperçu ${layer.type} non pris en charge.`);
    nodes.push(node);
  }
  return {
    sceneVersion: 1, format: structuredClone(variant.format), warnings,
    pages: rowPages.map((rows, index) => ({
      number: index + 1,
      nodes: nodes.map((node) => structuredClone(node.id === paginatedId ? { ...node, rows } : node)),
    })),
  };
}
