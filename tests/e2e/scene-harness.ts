import { createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import { Preview } from "../../src/editor/Preview.js";
import type { CampaignBundle } from "../../src/storage/indexeddb.js";
import { sceneFixture } from "../scene-fixture.js";
import "../../src/editor/style.css";

function Harness() {
  const [bundle, setBundle] = useState<CampaignBundle>(() => ({ campaign: sceneFixture().campaign, assets: new Map() }));
  const [selected, select] = useState("");
  const [mounted, setMounted] = useState(true);
  const [error, setError] = useState("");
  async function loadFont(mode: "valid" | "missing" | "invalid") {
    const next = structuredClone(bundle);
    const id = "test:font", path = "assets/test-font.ttf";
    next.campaign.assets = [{ id, path, mimeType: "font/ttf", sha256: "a".repeat(64), source: "Fixture locale Bangers", rights: "SIL OFL 1.1" }];
    next.campaign.brand!.fonts.title = { assetId: id };
    if (mode === "missing") next.assets.delete(path);
    else if (mode === "invalid") next.assets.set(path, new Uint8Array([1, 2, 3]));
    else {
      const response = await fetch(new URL("../../src/editor/site-fonts/Bangers-Regular.ttf", import.meta.url));
      if (!response.ok) throw new Error("Police de test inaccessible");
      next.assets.set(path, new Uint8Array(await response.arrayBuffer()));
    }
    setBundle(next);
  }
  return h("main", { style: { maxWidth: 760, padding: 20, margin: "auto" } },
    h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 } },
      ...(["valid", "missing", "invalid"] as const).map((mode) => h("button", { key: mode, onClick: () => void loadFont(mode).catch((e) => setError(String(e))) }, `Police ${mode}`)),
      h("button", { onClick: () => setMounted(!mounted) }, "Basculer aperçu"),
      h("button", { onClick: () => { const next = structuredClone(bundle); next.campaign.content.title = "Un titre fictif beaucoup plus long pour contrôler son ajustement automatique sans perdre un seul mot"; setBundle(next); } }, "Titre long"),
    ),
    error ? h("p", { role: "alert" }, error) : null,
    mounted ? h(Preview, { bundle, supportId: "support", variantId: "square", selected, select,
      move: (id, x, y) => {
        const next = structuredClone(bundle), variant = next.campaign.supports[0].variants[0];
        const placement = next.campaign.supports[0].template.layouts[0].placements.find((item) => item.layerId === id)!;
        variant.placementOverrides[id] = { frame: { ...(variant.placementOverrides[id]?.frame ?? placement.frame), x, y } };
        setBundle(next);
      },
    }) : null,
  );
}
createRoot(document.getElementById("root")!).render(h(Harness));
