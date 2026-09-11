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

/** Binary font sources mirrored from falcoer/flowtherapy-bio-website. */
export const flowTherapySiteFontAssets = [
  {
    id: "bangers",
    family: "Bangers",
    role: "title",
    sourcePath: new URL("./site-fonts/Bangers-Regular.ttf", import.meta.url).href,
    source: "flowtherapy-bio-website · assets-src/fonts/bangers/Bangers-Regular.ttf",
    fileName: "Bangers-Regular.ttf",
  },
  {
    id: "inter",
    family: "Inter",
    role: "body",
    sourcePath: new URL("./site-fonts/Inter-Variable.ttf", import.meta.url).href,
    source: "flowtherapy-bio-website · assets-src/fonts/inter/Inter-Variable.ttf.gz (décompressé)",
    fileName: "Inter-Variable.ttf",
  },
  {
    id: "kalam-regular",
    family: "Kalam",
    role: "caption",
    sourcePath: new URL("./site-fonts/Kalam-Regular.ttf", import.meta.url).href,
    source: "flowtherapy-bio-website · assets-src/fonts/kalam/Kalam-Regular.ttf",
    fileName: "Kalam-Regular.ttf",
  },
  {
    id: "kalam-bold",
    family: "Kalam",
    role: "caption",
    sourcePath: new URL("./site-fonts/Kalam-Bold.ttf", import.meta.url).href,
    source: "flowtherapy-bio-website · assets-src/fonts/kalam/Kalam-Bold.ttf",
    fileName: "Kalam-Bold.ttf",
  },
] as const;
