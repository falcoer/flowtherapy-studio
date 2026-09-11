import type { Brand } from "../domain/model.js";

/**
 * Palette and typography roles transcribed from the public Flow Therapy site
 * repository: falcoer/flowtherapy-bio-website/docs/brand/README.md.
 *
 * Binary logos and fonts are intentionally not bundled: they must be imported
 * through the Branding screen with their provenance and usage rights.
 */
export const flowTherapySiteBrand = {
  name: "Flow Therapy — Site internet",
  description:
    "Référentiel graphique du site flowtherapymusic.com, source : dépôt flowtherapy-bio-website.",
  tags: ["flow-therapy", "site", "musique", "bangers", "inter", "kalam"],
  colors: {
    background: "#FBF8F2",
    surface: "#FFFFFF",
    text: "#17171B",
    muted: "#54515B",
    accent: "#7130C8",
    contrast: "#ED7100",
    purple: "#7130C8",
    orange: "#ED7100",
    pink: "#E72F88",
    blue: "#168AD5",
    darkBackground: "#07101D",
    darkSurface: "#101A2B",
    darkText: "#FFFAF1",
    darkMuted: "#C7C1CA",
    darkAccent: "#9A48F0",
    darkContrast: "#FF8A00",
    darkPurple: "#9A48F0",
    darkOrange: "#FF8A00",
    darkPink: "#FF3B9D",
    darkBlue: "#19A7EF",
  },
} satisfies Pick<Brand, "name" | "description" | "tags" | "colors">;

export const flowTherapySiteFonts = {
  title: "Bangers",
  body: "Inter",
  caption: "Kalam",
} as const;
