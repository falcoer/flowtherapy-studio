import { useEffect, useId, useState } from "react";
import type { MeasureText } from "../render/scene.js";
import type { CampaignBundle } from "../storage/indexeddb.js";

/** Per-preview FontFace lifetime; no network request or shared global ownership. */
export function useSceneFonts(bundle: CampaignBundle) {
  const instance = useId().replace(/[^a-zA-Z0-9]/g, "");
  const selected = [...new Set(Object.values(bundle.campaign.brand?.fonts ?? {}).map((ref) => ref.assetId))]
    .sort().map((id) => {
      const asset = bundle.campaign.assets.find((item) => item.id === id);
      return { id, asset, bytes: asset && bundle.assets.get(asset.path) };
    });
  // Metadata hashes are verified by the storage/import boundary. Include presence
  // so restoring a missing ZIP file triggers a reload, unlike ordinary text edits.
  const signature = JSON.stringify(selected.map(({ id, asset, bytes }) => [id, asset?.sha256, asset?.mimeType, bytes?.byteLength]));
  const [state, setState] = useState<{
    signature: string; families: Record<string, string>; warnings: string[];
  }>({ signature: "", families: {}, warnings: [] });
  useEffect(() => {
    let active = true;
    const faces: FontFace[] = [];
    const fontSet = document.fonts as FontFaceSet & {
      add(face: FontFace): void; delete(face: FontFace): boolean;
    };
    const load = async () => {
      const families: Record<string, string> = {}, warnings: string[] = [];
      await Promise.all(selected.map(async ({ id, asset, bytes }, index) => {
        if (!asset || !bytes || !["font/ttf", "font/otf", "font/woff", "font/woff2"].includes(asset.mimeType)) {
          warnings.push(`Police ${id} : fichier absent ou format non pris en charge. Restaurer le ZIP avec ses ressources.`);
          return;
        }
        const family = `FTScene-${instance}-${index}-${asset.sha256}`;
        try {
          const face = new FontFace(family, new Uint8Array(bytes).buffer);
          faces.push(face);
          await face.load();
          if (!active) return;
          fontSet.add(face);
          families[id] = `"${family}"`;
        } catch {
          warnings.push(`Police ${id} illisible : police de substitution utilisée.`);
        }
      }));
      if (active) setState({ signature, families, warnings: warnings.sort() });
    };
    void load();
    return () => { active = false; faces.forEach((face) => fontSet.delete(face)); };
  }, [signature, instance]);
  const ready = state.signature === signature;
  return { ready, families: ready ? state.families : {}, warnings: ready ? state.warnings : [] };
}

export function createBrowserMeasurer(): MeasureText {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) throw new Error("Mesure typographique indisponible dans ce navigateur.");
  context.fontKerning = "normal";
  return (text, font) => {
    context.font = `400 ${font.size}px ${font.family}`;
    return context.measureText(text).width;
  };
}
