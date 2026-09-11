import { useEffect, useState } from "react";
import { websiteBrand } from "../domain/website-brand.js";
import type { WebsiteBrandTheme } from "../domain/website-brand.js";
import type { CampaignBundle } from "../storage/indexeddb.js";
import "./website-brand.css";

export function WebsiteBrandPreset({ onSelect }: {
  onSelect: (theme: WebsiteBrandTheme) => void;
}) {
  return (
    <section className="branding-card website-brand-preset">
      <div>
        <span className="eyebrow">PRÉRÉGLAGE DU GROUPE</span>
        <h2>Flow Therapy · identité du site</h2>
        <p>Les palettes claire et sombre de flowtherapymusic.com, le logo transparent et les polices Bangers, Inter et Kalam.</p>
        <p className="website-brand-source">Source figée : {websiteBrand.source.repository} · {websiteBrand.source.commit.slice(0, 7)}. Le chargement remplace le brouillon, jamais une campagne automatiquement.</p>
      </div>
      <div className="actions">
        <button type="button" onClick={() => onSelect("light")}>Charger Flow Therapy — clair</button>
        <button type="button" onClick={() => onSelect("dark")}>Charger Flow Therapy — sombre</button>
      </div>
    </section>
  );
}

/** This specimen previews the draft, not the provisional campaign renderer. */
export function BrandSpecimen({ bundle }: { bundle: CampaignBundle }) {
  const brand = bundle.campaign.brand!;
  const [fonts, setFonts] = useState<Record<string, string>>({});
  const [fontError, setFontError] = useState("");
  const [logo, setLogo] = useState("");
  const fontKey = Object.entries(brand.fonts).map(([role, ref]) => {
    const asset = bundle.campaign.assets.find((a) => a.id === ref.assetId);
    return `${role}:${asset?.sha256}:${asset ? bundle.assets.has(asset.path) : false}`;
  }).join("|");
  const logoAsset = bundle.campaign.assets.find((a) => a.id === brand.logos?.primary?.assetId);
  const logoKey = `${logoAsset?.sha256}:${logoAsset ? bundle.assets.has(logoAsset.path) : false}`;
  useEffect(() => {
    let disposed = false;
    const added: FontFace[] = [];
    setFonts({});
    setFontError("");
    const loaded: Record<string, string> = {};
    void Promise.all(Object.entries(brand.fonts).map(async ([role, ref]) => {
      const asset = bundle.campaign.assets.find((a) => a.id === ref.assetId);
      const bytes = asset && bundle.assets.get(asset.path);
      if (!asset || !bytes) {
        if (!disposed) setFontError("Une police référencée est absente ; une police système la remplace dans cet aperçu.");
        return;
      }
      try {
        const family = `StudioBrand_${asset.sha256}`;
        const face = await new FontFace(family, new Uint8Array(bytes).buffer).load();
        if (disposed) return;
        document.fonts.add(face);
        added.push(face);
        loaded[role] = family;
      } catch {
        if (!disposed) setFontError("Une police ne peut pas être chargée ; une police système la remplace dans cet aperçu.");
      }
    })).then(() => { if (!disposed) setFonts(loaded); });
    return () => { disposed = true; for (const face of added) document.fonts.delete(face); };
  }, [fontKey]);
  useEffect(() => {
    const bytes = logoAsset && bundle.assets.get(logoAsset.path);
    const url = bytes && logoAsset
      ? URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: logoAsset.mimeType })) : "";
    setLogo(url);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [logoKey]);
  return (
    <section className="brand-specimen" aria-label="Aperçu de l’identité"
      style={{ background: brand.colors.background, color: brand.colors.text, borderColor: brand.colors.line }}>
      <div>
        <p className="brand-specimen-label">APERÇU DE L’IDENTITÉ</p>
        {logo && <img src={logo} alt="Logo de l’identité" className="brand-specimen-logo" />}
        <h2 style={{ fontFamily: fonts.title ?? "sans-serif", color: brand.colors.accent }}>Musique · Énergie · Émotion</h2>
        <p style={{ fontFamily: fonts.body ?? "sans-serif" }}>Flow Therapy — un univers musical, vivant et partagé.</p>
        <p style={{ fontFamily: fonts.caption ?? "cursive", color: brand.colors.contrast }}>Les couleurs, le logo et les polices de votre identité.</p>
        {fontError && <p role="status">{fontError}</p>}
      </div>
      <div className="brand-specimen-chips" aria-label="Couleurs de l’aperçu">
        {["purple", "orange", "pink", "blue"].filter((role) => brand.colors[role]).map((role) => (
          <span key={role} style={{ background: brand.colors[role] }} title={`${role} ${brand.colors[role]}`} />
        ))}
      </div>
    </section>
  );
}
