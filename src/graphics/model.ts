/** Standalone prototype contract. No dependency on React, WebGL or storage. */
export type Surface = {
  id: string;
  name: string;
  width: number;
  height: number;
  dpi: number;
};
export type Anchor = { id: string; name: string; x: number; y: number };
export type RendererKind = "image" | "text" | "shader";
export type ShaderId = "aurora" | "halo" | "waves";
export type RendererStyle = {
  kind: RendererKind;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  opacity: number;
  color: string;
  hue: number;
  saturation: number;
  brightness: number;
  text: string;
  font: string;
  fontSize: number;
  shader: ShaderId;
  speed: number;
  intensity: number;
  assetId: string;
};
export type Renderer = RendererStyle & {
  id: string;
  name: string;
  anchorId: string;
  z: number;
};
export type Preset = {
  id: string;
  name: string;
  description: string;
  style: RendererStyle;
};
export type Asset = {
  id: string;
  name: string;
  dataUrl: string;
  rights: string;
};
export type Project = {
  kind: "ft-graphic-project";
  schemaVersion: 1;
  name: string;
  surface: Surface;
  background: string;
  duration: number;
  fps: number;
  anchors: Anchor[];
  renderers: Renderer[];
  assets: Asset[];
};
export type Catalog<T> = {
  kind: "ft-surfaces" | "ft-renderers";
  schemaVersion: 1;
  items: T[];
};
export const FONTS = [
  "Bangers",
  "Inter",
  "Kalam",
  "Georgia",
  "monospace",
] as const;
export const SHADERS: ShaderId[] = ["aurora", "halo", "waves"];
export const MAX_JSON_BYTES = 32 * 1024 * 1024;
export const uid = () => crypto.randomUUID();
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
export const baseStyle: RendererStyle = {
  kind: "shader",
  width: 1080,
  height: 1350,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  opacity: 1,
  color: "#b9a0ff",
  hue: 0,
  saturation: 1,
  brightness: 1,
  text: "MAKE\nSOME NOISE.",
  font: "Bangers",
  fontSize: 160,
  shader: "aurora",
  speed: 1,
  intensity: 1,
  assetId: "",
};
export function instantiate(
  preset: Preset,
  anchorId: string,
  project: Project,
): Renderer {
  const scale = project.surface.width / 1080;
  return {
    ...structuredClone(preset.style),
    id: uid(),
    name: preset.name,
    anchorId,
    width: preset.style.width * scale,
    height: preset.style.height * scale,
    fontSize: preset.style.fontSize * scale,
    offsetX: preset.style.offsetX * scale,
    offsetY: preset.style.offsetY * scale,
    assetId: project.assets[0]?.id ?? "",
    z: Math.max(-1, ...project.renderers.map((r) => r.z)) + 1,
  };
}
export function changeSurface(project: Project, surface: Surface): Project {
  const sx = surface.width / project.surface.width,
    sy = surface.height / project.surface.height;
  return {
    ...project,
    surface: { ...surface },
    renderers: project.renderers.map((r) => ({
      ...r,
      width: r.width * sx,
      height: r.height * sy,
      offsetX: r.offsetX * sx,
      offsetY: r.offsetY * sy,
      fontSize: r.fontSize * Math.min(sx, sy),
    })),
  };
}
export function removeAnchor(project: Project, id: string): Project {
  return {
    ...project,
    anchors: project.anchors.filter((a) => a.id !== id),
    renderers: project.renderers.filter((r) => r.anchorId !== id),
  };
}
export type Guide = {
  kind: "x" | "y" | "midpoint";
  x: number;
  y: number;
  from?: Anchor;
  to?: Anchor;
};
/** Threshold is supplied in document-normalized units derived from screen pixels. */
export function snapAnchor(
  point: { x: number; y: number },
  anchors: Anchor[],
  tolerance: { x: number; y: number },
): { x: number; y: number; guides: Guide[] } {
  let x = clamp(point.x, 0, 1),
    y = clamp(point.y, 0, 1);
  const guides: Guide[] = [];
  let nearest = Infinity,
    midpoint: Guide | undefined;
  for (let i = 0; i < anchors.length; i++)
    for (let j = i + 1; j < anchors.length; j++) {
      const mx = (anchors[i].x + anchors[j].x) / 2,
        my = (anchors[i].y + anchors[j].y) / 2;
      const distance = Math.hypot(
        (x - mx) / tolerance.x,
        (y - my) / tolerance.y,
      );
      if (distance <= 1 && distance < nearest) {
        nearest = distance;
        midpoint = {
          kind: "midpoint",
          x: mx,
          y: my,
          from: anchors[i],
          to: anchors[j],
        };
      }
    }
  if (midpoint) return { x: midpoint.x, y: midpoint.y, guides: [midpoint] };
  const refs = [...anchors, { id: "surface-center", name: "", x: 0.5, y: 0.5 }];
  const ax = refs
    .filter((a) => Math.abs(a.x - x) <= tolerance.x)
    .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
  const ay = refs
    .filter((a) => Math.abs(a.y - y) <= tolerance.y)
    .sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0];
  if (ax) {
    x = ax.x;
    guides.push({ kind: "x", x, y });
  }
  if (ay) {
    y = ay.y;
    guides.push({ kind: "y", x, y });
  }
  return { x, y, guides };
}
function record(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Objet JSON attendu.");
}
function string(
  value: unknown,
  label: string,
  max = 200,
  empty = false,
): asserts value is string {
  if (
    typeof value !== "string" ||
    (!empty && !value.trim()) ||
    value.length > max
  )
    throw new Error(`${label} : texte invalide (maximum ${max}).`);
}
function number(
  value: unknown,
  label: string,
  min: number,
  max: number,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error(`${label} : valeur attendue entre ${min} et ${max}.`);
}
function color(value: unknown) {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value))
    throw new Error("Couleur hexadécimale #RRGGBB attendue.");
}
function items(
  value: unknown,
  max: number,
): asserts value is Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error(`Liste attendue, maximum ${max} éléments.`);
  const ids = new Set();
  for (const item of value) {
    record(item);
    string(item.id, "Identifiant");
    if (ids.has(item.id)) throw new Error(`Identifiant dupliqué : ${item.id}`);
    ids.add(item.id);
  }
}
export function validateSurface(value: unknown): asserts value is Surface {
  record(value);
  string(value.id, "Identifiant");
  string(value.name, "Nom");
  number(value.width, "Largeur", 64, 6000);
  number(value.height, "Hauteur", 64, 6000);
  number(value.dpi, "DPI", 72, 600);
  if (
    !Number.isInteger(value.width) ||
    !Number.isInteger(value.height) ||
    value.width * value.height > 20_000_000
  )
    throw new Error("Surface : pixels entiers, maximum 20 mégapixels.");
}
function validateStyle(value: unknown): asserts value is RendererStyle {
  record(value);
  if (!["image", "text", "shader"].includes(value.kind as string))
    throw new Error("Type de renderer inconnu.");
  for (const k of ["width", "height"]) number(value[k], k, 1, 12000);
  for (const k of ["offsetX", "offsetY"]) number(value[k], k, -12000, 12000);
  number(value.rotation, "Rotation", -360, 360);
  number(value.opacity, "Opacité", 0, 1);
  color(value.color);
  number(value.hue, "Teinte", -180, 180);
  number(value.saturation, "Saturation", 0, 3);
  number(value.brightness, "Luminosité", 0, 3);
  number(value.fontSize, "Taille police", 1, 3000);
  string(value.text, "Texte", 10000, true);
  string(value.assetId, "Ressource", 200, true);
  if (!FONTS.includes(value.font as (typeof FONTS)[number]))
    throw new Error("Police inconnue.");
  if (!SHADERS.includes(value.shader as ShaderId))
    throw new Error("Shader inconnu.");
  number(value.speed, "Vitesse", 0, 5);
  number(value.intensity, "Intensité", 0, 3);
}
/** Cheap mutation gate: do not rescan embedded image bytes during pointer movement. */
export function validateScene(p: Project): void {
  validateSurface(p.surface);
  items(p.anchors, 100);
  items(p.renderers, 100);
  for (const a of p.anchors) {
    number(a.x, "X ancrage", 0, 1);
    number(a.y, "Y ancrage", 0, 1);
  }
  for (const r of p.renderers) {
    validateStyle(r);
    number(r.z, "Ordre", -1000, 1000);
    if (!p.anchors.some((a) => a.id === r.anchorId))
      throw new Error("Ancrage introuvable.");
    if (r.kind === "image" && !p.assets.some((a) => a.id === r.assetId))
      throw new Error("Importez d’abord une image dans la bibliothèque.");
  }
}
export function parseCatalog<T extends Surface | Preset>(
  text: string,
  kind: Catalog<T>["kind"],
): Catalog<T> {
  const data: unknown = parseJSON(text);
  record(data);
  if (data.kind !== kind || data.schemaVersion !== 1)
    throw new Error("Type ou version du catalogue non pris en charge.");
  items(data.items, 100);
  if (!data.items.length)
    throw new Error("Le catalogue doit contenir au moins un élément.");
  for (const item of data.items) {
    if (kind === "ft-surfaces") validateSurface(item);
    else {
      string(item.name, "Nom");
      string(item.description, "Description", 500, true);
      validateStyle(item.style);
    }
  }
  return data as unknown as Catalog<T>;
}
function parseJSON(text: string): unknown {
  if (new TextEncoder().encode(text).length > MAX_JSON_BYTES)
    throw new Error("JSON trop volumineux (32 Mio maximum).");
  return JSON.parse(text);
}
export function parseProject(text: string): Project {
  const p: unknown = parseJSON(text);
  record(p);
  if (p.kind !== "ft-graphic-project" || p.schemaVersion !== 1)
    throw new Error("Type ou version du document non pris en charge.");
  string(p.name, "Nom");
  validateSurface(p.surface);
  color(p.background);
  number(p.duration, "Durée", 1, 10);
  number(p.fps, "Images/seconde", 1, 30);
  if (!Number.isInteger(p.fps))
    throw new Error("La cadence doit être entière.");
  items(p.anchors, 100);
  items(p.renderers, 100);
  items(p.assets, 50);
  for (const a of p.anchors) {
    string(a.name, "Nom ancrage");
    number(a.x, "X ancrage", 0, 1);
    number(a.y, "Y ancrage", 0, 1);
  }
  for (const a of p.assets) {
    string(a.name, "Nom image");
    string(a.rights, "Droits", 1000, true);
    if (
      typeof a.dataUrl !== "string" ||
      !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/]+=*$/.test(a.dataUrl)
    )
      throw new Error("Image locale PNG, JPEG ou WebP en base64 attendue.");
  }
  for (const r of p.renderers) {
    string(r.name, "Nom renderer");
    number(r.z, "Ordre", -1000, 1000);
    if (!p.anchors.some((a) => a.id === r.anchorId))
      throw new Error("Ancrage du renderer introuvable.");
    validateStyle(r);
    if (r.kind === "image" && !p.assets.some((a) => a.id === r.assetId))
      throw new Error("Image du renderer introuvable.");
  }
  return p as unknown as Project;
}
