/** Independent, versioned lab recipes. Campaign v1 remains unchanged. */
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
export interface CreativeRecipe {
  recipeVersion: 1;
  name: string;
  energy: number;
  density: number;
  scale: number;
  harmony: keyof typeof harmonies;
}
export const recipes: CreativeRecipe[] = [
  {
    recipeVersion: 1,
    name: "Intimiste",
    energy: 15,
    density: 20,
    scale: 35,
    harmony: "plum",
  },
  {
    recipeVersion: 1,
    name: "Funk électrique",
    energy: 65,
    density: 45,
    scale: 65,
    harmony: "petrol",
  },
  {
    recipeVersion: 1,
    name: "Festival solaire",
    energy: 95,
    density: 70,
    scale: 90,
    harmony: "solar",
  },
];
export const clamp = (n: number) => Math.min(100, Math.max(0, n));
export function parseRecipe(value: unknown): CreativeRecipe {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Recette invalide.");
  const r = value as Record<string, unknown>;
  const keys = [
    "recipeVersion",
    "name",
    "energy",
    "density",
    "scale",
    "harmony",
  ];
  if (
    Object.keys(r).some((k) => !keys.includes(k)) ||
    r.recipeVersion !== 1 ||
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
    recipeVersion: 1,
    name: r.name,
    energy: r.energy as number,
    density: r.density as number,
    scale: r.scale as number,
    harmony: r.harmony as CreativeRecipe["harmony"],
  };
}
export function resolveCreative(r: CreativeRecipe) {
  return {
    ...harmonies[r.harmony],
    titleSize: 22 + r.scale * 0.22,
    tilt: -r.energy * 0.045,
    gap: 18 - r.density * 0.12,
    amplitude: 8 + r.energy * 0.42,
    lines: 3 + Math.floor(r.energy / 20),
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
