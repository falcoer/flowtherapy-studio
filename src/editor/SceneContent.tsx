import { useEffect, useState } from "react";
import type { Placement, Value } from "../domain/model.js";
import type { SceneNode, TextBlock } from "../render/scene.js";
import type { CampaignBundle } from "../storage/indexeddb.js";

function ImageLayer({ bundle, value, placement }: {
  bundle: CampaignBundle; value?: Value; placement: Placement;
}) {
  const asset = value && typeof value === "object" && !Array.isArray(value)
    ? bundle.campaign.assets.find((item) => item.id === value.assetId) : undefined;
  const bytes = asset && bundle.assets.get(asset.path);
  const [url, setURL] = useState(""), [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (!bytes || !asset || !["image/png", "image/jpeg"].includes(asset.mimeType)) {
      setURL(""); return;
    }
    const next = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: asset.mimeType }));
    setURL(next);
    return () => URL.revokeObjectURL(next);
  }, [bytes, asset?.mimeType]);
  const fit = placement.imageFit ?? { mode: "cover", focalX: 0.5, focalY: 0.5 };
  return url && !failed ? <img alt="Image de la composition" draggable={false} src={url}
    onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: fit.mode,
      objectPosition: `${fit.focalX * 100}% ${fit.focalY * 100}%` }} />
    : <span className="missing">{failed ? "Image illisible" : "Image manquante — importer le ZIP avec ses ressources"}</span>;
}
function Lines({ block }: { block: TextBlock }) {
  return <div className="scene-text" style={{ fontSize: block.fontSize, lineHeight: `${block.lineHeight}px` }}>
    {block.lines.map((line, index) => <div key={index} style={{ height: block.lineHeight }}>{line || "\u200b"}</div>)}
  </div>;
}
export function SceneContent({ node, bundle }: { node: SceneNode; bundle: CampaignBundle }) {
  if (node.text) return <Lines block={node.text} />;
  if (node.layer.type === "image") return <ImageLayer bundle={bundle} value={node.value} placement={node.placement} />;
  if (node.rows) return <div className="event-preview">
    {node.rows.map((row) => <div className="event-preview-row" key={row.id} data-event-id={row.id}
      style={{ position: "absolute", top: row.y, left: 0, width: "100%", height: row.height }}>
      {row.cells.map((cell) => <div key={cell.field} data-event-field={cell.field} style={{ position: "absolute",
        left: cell.frame.x, top: cell.frame.y, width: cell.frame.width, height: cell.frame.height }}>
        <Lines block={cell.text} />
      </div>)}
    </div>)}
  </div>;
  return node.layer.type === "shape" ? null : <span>Aperçu {node.layer.type} indisponible</span>;
}
