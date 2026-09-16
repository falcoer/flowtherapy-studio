import { useState } from "react";
import type { CampaignBundle } from "../storage/indexeddb.js";
import { selectEditorial } from "../storage/editorial.js";
import { BrandWorkspace } from "./BrandWorkspace.js";
import { Branding as LegacyBranding } from "./LegacyBranding.js";
import { Library } from "./Library.js";
import "./branding-transition.css";

export function Branding({
  bundle,
  onApply,
}: {
  bundle: CampaignBundle;
  onApply: (next: CampaignBundle) => void;
}) {
  const [mode, setMode] = useState<"configuration" | "library" | "legacy">(
    "configuration",
  );
  return (
    <>
      <nav className="brand-workspace-switch" aria-label="Espaces Marque et Bibliothèque">
        <button
          className={mode === "configuration" ? "primary" : ""}
          aria-pressed={mode === "configuration"}
          onClick={() => setMode("configuration")}
        >
          Marque
        </button>
        <button
          className={mode === "library" ? "primary" : ""}
          aria-pressed={mode === "library"}
          onClick={() => setMode("library")}
        >
          Bibliothèque
        </button>
        <button
          className={mode === "legacy" ? "primary" : ""}
          aria-pressed={mode === "legacy"}
          onClick={() => setMode("legacy")}
        >
          Outils historiques
        </button>
        <span>
          Transition du shell : Marque et Bibliothèque utilisent déjà le nouveau modèle ;
          les fonctions restantes restent accessibles dans l’éditeur historique.
        </span>
      </nav>
      <div hidden={mode !== "configuration"}>
        <BrandWorkspace bundle={bundle} onApply={onApply} />
      </div>
      <div hidden={mode !== "library"}>
        <Library
          active={mode === "library"}
          bundle={bundle}
          onUse={async (document, store) =>
            onApply(await selectEditorial(bundle, document, store))
          }
        />
      </div>
      <div hidden={mode !== "legacy"}>
        <LegacyBranding bundle={bundle} onApply={onApply} />
      </div>
    </>
  );
}
