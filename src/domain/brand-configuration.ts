import type { Brand, Campaign } from "./model.js";

export type BrandObjectType =
  | "color-token"
  | "font-role"
  | "logo"
  | "component"
  | "rule";
export type BrandRelationType =
  | "uses"
  | "constrains"
  | "replaces"
  | "compatibleWith"
  | "derivedFrom";
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface BrandObject {
  id: string;
  type: BrandObjectType;
  role: string;
  label: string;
  status: "published" | "draft";
  revision: number;
  value: JsonValue;
  metadata?: { [key: string]: string };
}
export interface BrandRelation {
  id: string;
  sourceId: string;
  targetId: string;
  type: BrandRelationType;
}
export interface ChangeOperation {
  id: string;
  kind: "update";
  objectId: string;
  before: JsonValue;
  after: JsonValue;
}
export interface ChangeSet {
  id: string;
  baseReleaseId: string;
  status: "draft";
  operations: ChangeOperation[];
}
export interface ValidationFinding {
  id: string;
  severity: "info" | "warning" | "error";
  scopeId: string;
  message: string;
}
export interface BrandRelease {
  schemaVersion: 1;
  id: string;
  brandId: string;
  version: number;
  createdAt: string;
  objects: BrandObject[];
  relations: BrandRelation[];
  findings: ValidationFinding[];
  fingerprint: string;
}
export interface BrandDraft {
  schemaVersion: 1;
  brandId: string;
  baseReleaseId: string;
  objects: BrandObject[];
  relations: BrandRelation[];
  changeSet: ChangeSet;
}
export interface BrandConfiguration {
  schemaVersion: 1;
  brandId: string;
  name: string;
  revision: number;
  releases: BrandRelease[];
  draft?: BrandDraft;
}
export interface ImpactUsage {
  id: string;
  label: string;
  kind: "template" | "campaign" | "component";
  objectIds: string[];
  migration: "automatic" | "manual";
}
export interface ImpactReport {
  complete: true;
  changedIds: string[];
  dependentIds: string[];
  templates: ImpactUsage[];
  campaigns: ImpactUsage[];
  components: ImpactUsage[];
  findings: ValidationFinding[];
  automaticMigrations: string[];
  manualActions: string[];
}

const colorRoles: Record<string, string> = {
  background: "background",
  surface: "surface",
  text: "text",
  muted: "muted",
  accent: "accent",
  contrast: "contrast",
  purple: "purple",
  orange: "orange",
  pink: "pink",
  blue: "primary",
  darkBackground: "background.dark",
  darkSurface: "surface.dark",
  darkText: "text.dark",
  darkMuted: "muted.dark",
  darkAccent: "accent.dark",
  darkContrast: "contrast.dark",
  darkPurple: "purple.dark",
  darkOrange: "orange.dark",
  darkPink: "pink.dark",
  darkBlue: "primary.dark",
};
const colorLabels: Record<string, string> = {
  primary: "Bleu Flow",
  "primary.dark": "Bleu Flow · sombre",
  background: "Fond clair",
  "background.dark": "Fond sombre",
  surface: "Surface claire",
  "surface.dark": "Surface sombre",
  text: "Texte principal",
  "text.dark": "Texte principal · sombre",
  muted: "Texte secondaire",
  "muted.dark": "Texte secondaire · sombre",
  accent: "Accent violet",
  "accent.dark": "Accent violet · sombre",
  contrast: "Contraste orange",
  "contrast.dark": "Contraste orange · sombre",
};

function clone<T>(value: T): T {
  return structuredClone(value);
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
function fingerprint(value: unknown): string {
  const text = stable(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
function releaseFingerprint(
  brandId: string,
  version: number,
  objects: BrandObject[],
  relations: BrandRelation[],
) {
  return fingerprint({ brandId, version, objects, relations });
}
function assertHex(value: string) {
  if (!/^#[0-9a-f]{6}$/i.test(value))
    throw new Error("La couleur doit être au format #RRGGBB.");
}
function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}
export function contrastRatio(a: string, b: string): number {
  assertHex(a);
  assertHex(b);
  const luminance = (hex: string) => {
    const value = Number.parseInt(hex.slice(1), 16);
    const r = channel((value >> 16) & 255);
    const g = channel((value >> 8) & 255);
    const blue = channel(value & 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * blue;
  };
  const first = luminance(a),
    second = luminance(b),
    light = Math.max(first, second),
    dark = Math.min(first, second);
  return (light + 0.05) / (dark + 0.05);
}
function colorValue(objects: BrandObject[], id: string) {
  const value = objects.find((object) => object.id === id)?.value;
  return typeof value === "string" ? value : undefined;
}
function findings(objects: BrandObject[]): ValidationFinding[] {
  const primary = colorValue(objects, "color.primary");
  if (!primary) {
    return [
      {
        id: "missing-primary",
        severity: "error",
        scopeId: "color.primary",
        message: "Le jeton color.primary est absent.",
      },
    ];
  }
  const result: ValidationFinding[] = [];
  for (const [id, label] of [
    ["color.background", "fond clair"],
    ["color.surface", "surface claire"],
  ] as const) {
    const background = colorValue(objects, id);
    if (!background) continue;
    const ratio = contrastRatio(primary, background);
    result.push({
      id: `contrast:${id}`,
      severity: ratio >= 3 ? "info" : "error",
      scopeId: "color.primary",
      message: `Contraste avec ${label} : ${ratio.toFixed(2)}:1${ratio >= 3 ? "" : " — minimum 3:1"}.`,
    });
  }
  return result;
}

export function migrateBrandV2(brand: Brand): BrandConfiguration {
  const colorObjects: BrandObject[] = Object.entries(brand.colors)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([legacyRole, value]) => {
      const role = colorRoles[legacyRole] ?? legacyRole;
      return {
        id: `color.${role}`,
        type: "color-token" as const,
        role,
        label: colorLabels[role] ?? legacyRole,
        status: "published" as const,
        revision: brand.revision,
        value,
        metadata: {
          legacyRole,
          theme: legacyRole.startsWith("dark") ? "dark" : "light",
        },
      };
    });
  if (!colorObjects.some((object) => object.id === "color.primary")) {
    const source =
      colorObjects.find((object) => object.id === "color.accent") ??
      colorObjects.find((object) => object.metadata?.theme === "light");
    if (source && typeof source.value === "string") {
      colorObjects.push({
        id: "color.primary",
        type: "color-token",
        role: "primary",
        label: "Couleur principale",
        status: "published",
        revision: brand.revision,
        value: source.value,
        metadata: {
          legacyRole: source.metadata?.legacyRole ?? source.role,
          theme: "light",
          migratedFallback: "true",
        },
      });
    }
  }
  const fontObjects: BrandObject[] = Object.entries(brand.fonts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([role, ref]) => ({
      id: `font.${role}`,
      type: "font-role",
      role,
      label: `Police · ${role}`,
      status: "published",
      revision: brand.revision,
      value: { assetId: ref.assetId },
    }));
  const logoObjects: BrandObject[] = Object.entries(brand.logos ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([role, ref]) => ({
      id: `logo.${role}`,
      type: "logo",
      role,
      label: `Logo · ${role}`,
      status: "published",
      revision: brand.revision,
      value: { assetId: ref.assetId },
    }));
  const supportingObjects: BrandObject[] = [
    {
      id: "component.brand-accent",
      type: "component",
      role: "accent",
      label: "Accent de marque",
      status: "published",
      revision: 1,
      value: { description: "Titres, repères et ornements utilisant le bleu principal." },
    },
    {
      id: "rule.primary-contrast",
      type: "rule",
      role: "contrast",
      label: "Contraste du bleu principal",
      status: "published",
      revision: 1,
      value: { minimumRatio: 3 },
    },
  ];
  const colorIds = new Set(colorObjects.map((object) => object.id));
  const relations: BrandRelation[] = [];
  if (colorIds.has("color.primary")) {
    relations.push(
      {
        id: "component.brand-accent:uses:color.primary",
        sourceId: "component.brand-accent",
        targetId: "color.primary",
        type: "uses",
      },
      {
        id: "rule.primary-contrast:constrains:color.primary",
        sourceId: "rule.primary-contrast",
        targetId: "color.primary",
        type: "constrains",
      },
    );
  }
  if (colorIds.has("color.background")) {
    relations.push({
      id: "rule.primary-contrast:uses:color.background",
      sourceId: "rule.primary-contrast",
      targetId: "color.background",
      type: "uses",
    });
  }
  const objects = [...colorObjects, ...fontObjects, ...logoObjects, ...supportingObjects];
  const release: BrandRelease = {
    schemaVersion: 1,
    id: `${brand.id}@1`,
    brandId: brand.id,
    version: 1,
    createdAt: "legacy-import",
    objects,
    relations,
    findings: findings(objects),
    fingerprint: releaseFingerprint(brand.id, 1, objects, relations),
  };
  return {
    schemaVersion: 1,
    brandId: brand.id,
    name: brand.name,
    revision: 1,
    releases: [release],
  };
}

export function latestRelease(configuration: BrandConfiguration): BrandRelease {
  const release = configuration.releases.at(-1);
  if (!release) throw new Error("Aucune release de marque disponible.");
  return clone(release);
}
export function createDraft(
  configuration: BrandConfiguration,
  release = latestRelease(configuration),
): BrandDraft {
  return {
    schemaVersion: 1,
    brandId: configuration.brandId,
    baseReleaseId: release.id,
    objects: release.objects.map((object) => ({ ...clone(object), status: "published" })),
    relations: clone(release.relations),
    changeSet: {
      id: `changes:${release.id}`,
      baseReleaseId: release.id,
      status: "draft",
      operations: [],
    },
  };
}
export function updateColorToken(
  input: BrandDraft,
  objectId: string,
  value: string,
): BrandDraft {
  assertHex(value);
  const draft = clone(input);
  const object = draft.objects.find((candidate) => candidate.id === objectId);
  if (!object || object.type !== "color-token")
    throw new Error(`Jeton de couleur introuvable : ${objectId}.`);
  const baseValue = object.value;
  object.value = value.toUpperCase();
  object.status = "draft";
  object.revision += 1;
  const existing = draft.changeSet.operations.find(
    (operation) => operation.objectId === objectId,
  );
  if (existing) existing.after = object.value;
  else
    draft.changeSet.operations.push({
      id: `update:${objectId}`,
      kind: "update",
      objectId,
      before: baseValue,
      after: object.value,
    });
  return draft;
}
export function analyzeImpact(
  draft: BrandDraft,
  usages: ImpactUsage[] = [],
): ImpactReport {
  const changed = new Set(draft.changeSet.operations.map((operation) => operation.objectId));
  const dependents = new Set<string>();
  const queue = [...changed];
  while (queue.length) {
    const target = queue.shift()!;
    for (const relation of draft.relations) {
      if (relation.targetId !== target || changed.has(relation.sourceId) || dependents.has(relation.sourceId))
        continue;
      dependents.add(relation.sourceId);
      queue.push(relation.sourceId);
    }
  }
  const affected = new Set([...changed, ...dependents]);
  const matched = usages.filter((usage) => usage.objectIds.some((id) => affected.has(id)));
  return {
    complete: true,
    changedIds: [...changed].sort(),
    dependentIds: [...dependents].sort(),
    templates: matched.filter((usage) => usage.kind === "template"),
    campaigns: matched.filter((usage) => usage.kind === "campaign"),
    components: matched.filter((usage) => usage.kind === "component"),
    findings: findings(draft.objects),
    automaticMigrations: matched
      .filter((usage) => usage.migration === "automatic")
      .map((usage) => usage.id)
      .sort(),
    manualActions: matched
      .filter((usage) => usage.migration === "manual")
      .map((usage) => usage.id)
      .sort(),
  };
}
export function publishDraft(
  input: BrandConfiguration,
  draft: BrandDraft,
  report: ImpactReport,
  createdAt: string,
): BrandConfiguration {
  if (draft.brandId !== input.brandId)
    throw new Error("Le brouillon n’appartient pas à cette marque.");
  if (draft.baseReleaseId !== latestRelease(input).id)
    throw new Error("Le brouillon est basé sur une release obsolète. Recréez-le depuis la dernière release.");
  if (!report.complete) throw new Error("L’analyse d’impact est incomplète.");
  if (!draft.changeSet.operations.length)
    throw new Error("Le lot de changements est vide.");
  const changedIds = draft.changeSet.operations
    .map((operation) => operation.objectId)
    .sort();
  if (JSON.stringify(changedIds) !== JSON.stringify([...report.changedIds].sort()))
    throw new Error("L’analyse d’impact ne correspond plus au brouillon courant.");
  const currentFindings = findings(draft.objects);
  if (currentFindings.some((finding) => finding.severity === "error"))
    throw new Error("Corrigez les contrôles en erreur avant publication.");
  const version = Math.max(0, ...input.releases.map((release) => release.version)) + 1;
  const objects = draft.objects.map((object) => ({
    ...clone(object),
    status: "published" as const,
  }));
  const relations = clone(draft.relations);
  const release: BrandRelease = {
    schemaVersion: 1,
    id: `${input.brandId}@${version}`,
    brandId: input.brandId,
    version,
    createdAt,
    objects,
    relations,
    findings: currentFindings,
    fingerprint: releaseFingerprint(input.brandId, version, objects, relations),
  };
  return {
    ...clone(input),
    revision: input.revision + 1,
    releases: [...input.releases, release],
    draft: undefined,
  };
}
export function brandFromRelease(base: Brand, release: BrandRelease): Brand {
  const brand = clone(base);
  brand.revision = release.version;
  for (const object of release.objects) {
    if (object.type !== "color-token" || typeof object.value !== "string") continue;
    const legacyRole = object.metadata?.legacyRole;
    if (legacyRole) brand.colors[legacyRole] = object.value;
  }
  return brand;
}
export function migrateCampaignBrand(
  campaign: Campaign,
  release: BrandRelease,
): Campaign {
  if (!campaign.brand) throw new Error("La campagne ne possède pas d’instantané de marque.");
  const next = clone(campaign);
  next.brand = brandFromRelease(next.brand!, release);
  return next;
}
