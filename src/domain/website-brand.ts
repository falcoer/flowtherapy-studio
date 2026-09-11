import definition from "../../catalog/brands/flowtherapy-website.json" with { type: "json" };
import type { Asset, Brand, Campaign } from "./model.js";

export type WebsiteBrandTheme = "light" | "dark";
export const websiteBrand = definition;
export const websiteColorRoles: Record<string, string> = {
  background: "Fond", surface: "Surface", text: "Texte", muted: "Texte secondaire",
  accent: "Accent", contrast: "Contraste", purple: "Violet", orange: "Orange",
  pink: "Rose", blue: "Bleu", line: "Séparateur",
};

/** A catalogue definition creates an independent v2 snapshot, never a live link. */
export function createWebsiteBrand(theme: WebsiteBrandTheme, assets: Asset[]): Brand {
  if (theme !== "light" && theme !== "dark") throw new Error("Palette Flow Therapy inconnue.");
  const ref = (id: string, mime: string) => {
    const matches = assets.filter((asset) => asset.id === id);
    if (matches.length !== 1 || !matches[0].mimeType.startsWith(mime))
      throw new Error(`Ressource Flow Therapy absente ou incompatible : ${id}`);
    return { assetId: id };
  };
  return {
    schemaVersion: 2,
    id: definition.id,
    revision: definition.revision,
    name: `${definition.name} · ${definition.themes[theme].name}`,
    description: `Source : ${definition.website} — ${definition.source.repository}@${definition.source.commit}. Palette ${theme}.`,
    tags: ["Flow Therapy", "website", theme],
    colors: { ...definition.themes[theme].colors },
    fonts: Object.fromEntries(Object.entries(definition.typography).map(([role, font]) => [role, ref(font.assetId, "font/")])),
    logos: Object.fromEntries(Object.entries(definition.logos).map(([role, id]) => [role, ref(id, "image/")])),
  };
}

export function createWebsiteBrandCampaign(theme: WebsiteBrandTheme, assets: Asset[]): Campaign {
  return {
    schemaVersion: 2, id: "studio-brand", revision: 1,
    name: "Identité du studio", locale: "fr-FR", content: {}, supports: [],
    assets: structuredClone(assets), brand: createWebsiteBrand(theme, assets),
  };
}
