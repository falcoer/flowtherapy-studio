import { useState } from "react";
import type { CampaignBundle } from "../storage/indexeddb.js";
import { BrandWorkspace } from "./BrandWorkspace.js";
import { Branding as LegacyBranding } from "./LegacyBranding.js";
import "./branding-transition.css";

export function Branding({
  bundle,
  onApply,
}: {
  bundle: CampaignBundle;
  onApply: (next: CampaignBundle) => void;
}) {
  const [mode, setMode] = useState<"configuration" | "legacy">("configuration");
  return (
    <>
      <nav className="brand-workspace-switch" aria-label="Mode de gestion de marque">
        <button
          className={mode === "configuration" ? "primary" : ""}
          aria-pressed={mode === "configuration"}
          onClick={() => setMode("configuration")}
        >
          Configuration de marque
        </button>
        <button
          className={mode === "legacy" ? "primary" : ""}
          aria-pressed={mode === "legacy"}
          onClick={() => setMode("legacy")}
        >
          Outils historiques
        </button>
        <span>
          Transition 0.3 : les fonctions non encore modélisées restent disponibles dans l’éditeur historique ; leur migration vers les releases reste explicite.
        </span>
      </nav>
      {mode === "configuration" ? (
        <BrandWorkspace bundle={bundle} onApply={onApply} />
      ) : (
        <LegacyBranding bundle={bundle} onApply={onApply} />
      )}
    </>
  );
}
