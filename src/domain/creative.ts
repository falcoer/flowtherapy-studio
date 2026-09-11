import type {
  Campaign,
  CreativeDirection,
  CreativeDominant,
  CreativeOverrides,
  Support,
} from "./model.js";

/** Pure, serializable creative-direction contracts shared by domain and UI. */
export const harmonies = {
  petrol: {
    name: "Minuit électrique",
    background: "#123e47",
    ink: "#fff9e9",
    accent: "#e8fa80",
  },
  solar: {
    name: "Soleil de scène",
    background: "#f8d66d",
    ink: "#402b46",
    accent: "#a93242",
  },
  plum: {
    name: "Velours violet",
    background: "#392745",
    ink: "#fff3e8",
    accent: "#f6a57f",
  },
} as const;
export interface CreativeRecipeV1 {
  recipeVersion: 1;
  name: string;
  energy: number;
  density: number;
  scale: number;
  harmony: keyof typeof harmonies;
}
export interface CreativeRecipe {
  recipeVersion: 2;
  name: string;
  energy: number;
  colorExpression: number;
  density: number;
  scale: number;
  dominant: CreativeDominant;
  harmony: keyof typeof harmonies;
}
export const defaultCreativeDirection: CreativeDirection = {
  directionVersion: 1,
  energy: 65,
  colorExpression: 60,
  density: 45,
  scale: 65,
  dominant: "balanced",
  harmony: "petrol",
};
export const recipes: CreativeRecipe[] = [
  {
    recipeVersion: 2,
    name: "Intimiste",
    energy: 15,
    colorExpression: 30,
    density: 20,
    scale: 35,
    dominant: "text",
    harmony: "plum",
  },
  {
    recipeVersion: 2,
    name: "Funk électrique",
    energy: 65,
    colorExpression: 60,
    density: 45,
    scale: 65,
    dominant: "balanced",
    harmony: "petrol",
  },
  {
    recipeVersion: 2,
    name: "Festival solaire",
    energy: 95,
    colorExpression: 95,
    density: 70,
    scale: 90,
    dominant: "balanced",
    harmony: "solar",
  },
];
export const clamp = (n: number) => Math.min(100, Math.max(0, n));
const axes = ["energy", "colorExpression", "density", "scale"] as const;
const dominants: CreativeDominant[] = ["image", "text", "balanced"];
export function parseRecipe(value: unknown): CreativeRecipe {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Recette invalide.");
  const r = value as Record<string, unknown>;
  const v1Keys = [
    "recipeVersion",
    "name",
    "energy",
    "density",
    "scale",
    "harmony",
  ];
  const v2Keys = [...v1Keys, "colorExpression", "dominant"];
  if (r.recipeVersion === 1) {
    if (
      Object.keys(r).some((k) => !v1Keys.includes(k)) ||
      typeof r.name !== "string" ||
      !r.name.trim() ||
      r.name.length > 80 ||
      typeof r.harmony !== "string" ||
      !Object.hasOwn(harmonies, r.harmony) ||
      [r.energy, r.density, r.scale].some(
        (n) => typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 100,
      )
    )
      throw new Error("Recette invalide ou version non prise en charge.");
    return {
      recipeVersion: 2,
      name: r.name,
      energy: r.energy as number,
      colorExpression: 50,
      density: r.density as number,
      scale: r.scale as number,
      dominant: "balanced",
      harmony: r.harmony as CreativeRecipe["harmony"],
    };
  }
  if (
    Object.keys(r).some((k) => !v2Keys.includes(k)) ||
    r.recipeVersion !== 2 ||
    typeof r.name !== "string" ||
    !r.name.trim() ||
    r.name.length > 80 ||
    typeof r.harmony !== "string" ||
    !Object.hasOwn(harmonies, r.harmony) ||
    typeof r.dominant !== "string" ||
    !dominants.includes(r.dominant as CreativeDominant) ||
    axes
      .map((axis) => r[axis])
      .some(
        (n) => typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 100,
      )
  )
    throw new Error("Recette invalide ou version non prise en charge.");
  return {
    recipeVersion: 2,
    name: r.name,
    energy: r.energy as number,
    colorExpression: r.colorExpression as number,
    density: r.density as number,
    scale: r.scale as number,
    dominant: r.dominant as CreativeDominant,
    harmony: r.harmony as CreativeRecipe["harmony"],
  };
}
export function directionToRecipe(
  direction: CreativeDirection,
  name = "Direction de campagne",
): CreativeRecipe {
  const { directionVersion: _, imageAssetId: __, ...settings } = direction;
  return parseRecipe({ ...settings, recipeVersion: 2, name });
}
export function recipeToDirection(
  recipe: CreativeRecipe,
  imageAssetId?: string,
): CreativeDirection {
  const { recipeVersion: _, name: __, ...settings } = parseRecipe(recipe);
  return {
    directionVersion: 1,
    ...settings,
    ...(imageAssetId ? { imageAssetId } : {}),
  };
}
export function campaignDirection(campaign: Campaign): CreativeDirection {
  return structuredClone(
    campaign.creativeDirection ?? defaultCreativeDirection,
  );
}
export function resolveSupportDirection(
  campaign: Campaign,
  support?: Support,
): CreativeDirection {
  const { imageAssetId, ...overrides } = support?.creativeOverrides ?? {};
  const direction: CreativeDirection = {
    ...campaignDirection(campaign),
    ...overrides,
    directionVersion: 1,
  };
  if (imageAssetId === null) delete direction.imageAssetId;
  else if (imageAssetId !== undefined) direction.imageAssetId = imageAssetId;
  return direction;
}
export function validateCreativeDirection(
  direction: CreativeDirection,
  campaign?: Campaign,
): void {
  if (
    direction.directionVersion !== 1 ||
    axes.some(
      (axis) =>
        typeof direction[axis] !== "number" ||
        !Number.isFinite(direction[axis]) ||
        direction[axis] < 0 ||
        direction[axis] > 100,
    ) ||
    !dominants.includes(direction.dominant) ||
    !Object.hasOwn(harmonies, direction.harmony)
  )
    throw new Error("Direction créative invalide.");
  if (direction.dominant === "image" && !direction.imageAssetId)
    throw new Error("La dominante Image requiert une ressource image.");
  if (direction.imageAssetId && campaign) {
    const asset = campaign.assets.find(
      (item) => item.id === direction.imageAssetId,
    );
    if (!asset || !asset.mimeType.startsWith("image/"))
      throw new Error("La ressource de direction créative est introuvable.");
  }
}
export function supportedOverrides(
  support: Support,
  overrides: CreativeOverrides,
): CreativeOverrides {
  const capabilities = support.template.creativeCapabilities;
  if (!capabilities && Object.keys(overrides).length)
    throw new Error("Ce template ne déclare aucun ajustement créatif.");
  for (const key of Object.keys(overrides)) {
    if (key === "harmony" || key === "imageAssetId") continue;
    if (!capabilities?.axes.includes(key as (typeof capabilities.axes)[number]))
      throw new Error(`Ajustement créatif non pris en charge : ${key}.`);
  }
  if (
    overrides.dominant &&
    !capabilities?.dominants.includes(overrides.dominant)
  )
    throw new Error("Dominante non prise en charge par ce template.");
  return structuredClone(overrides);
}
export function resolveCreative(r: CreativeRecipe | CreativeDirection) {
  return {
    ...harmonies[r.harmony],
    titleSize: 22 + r.scale * 0.22,
    tilt: -r.energy * 0.045,
    gap: 18 - r.density * 0.12,
    amplitude: 8 + r.energy * 0.42,
    lines: 3 + Math.floor(r.energy / 20),
    colorIntensity: 0.35 + r.colorExpression * 0.0065,
    dominant: r.dominant,
  };
}
export function explore(r: CreativeRecipe): CreativeRecipe[] {
  return [
    [-18, -15],
    [18, -15],
    [-18, 15],
    [18, 15],
  ].map(([x, y], i) => ({
    ...r,
    name: `Exploration ${i + 1}`,
    energy: clamp(r.energy + x),
    density: clamp(r.density + y),
  }));
}
