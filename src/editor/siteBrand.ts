import type { Brand } from "../domain/model.js";
import { websiteBrand } from "../domain/website-brand.js";

/** Compatibility with the first site preset: one catalogue, no second palette. */
const darkColors = Object.fromEntries(
  Object.entries(websiteBrand.themes.dark.colors).map(([role, value]) => [
    `dark${role[0].toUpperCase()}${role.slice(1)}`, value,
  ]),
);
export const flowTherapySiteBrand = {
  name: "Flow Therapy — Site internet",
  description: `Référentiel graphique de ${websiteBrand.website}, source : ${websiteBrand.source.repository}@${websiteBrand.source.commit}.`,
  tags: ["flow-therapy", "site", "musique", "bangers", "inter", "kalam"],
  colors: { ...websiteBrand.themes.light.colors, ...darkColors },
} satisfies Pick<Brand, "name" | "description" | "tags" | "colors">;

export const flowTherapySiteFonts = {
  title: websiteBrand.typography.title.family,
  body: websiteBrand.typography.body.family,
  caption: websiteBrand.typography.caption.family,
} as const;
