import type { SceneNode, TextBlock } from "../render/scene.js";
import type { CampaignBundle } from "../storage/indexeddb.js";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Le navigateur n'a pas pu décoder une image de la composition."));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("Le navigateur n'a pas produit le PNG.")),
    "image/png",
  ));
}

function applyRotation(context: CanvasRenderingContext2D, node: SceneNode, scale: number): void {
  const frame = node.placement.frame;
  const cx = (frame.x + frame.width / 2) * scale;
  const cy = (frame.y + frame.height / 2) * scale;
  context.translate(cx, cy);
  context.rotate(node.placement.rotation * Math.PI / 180);
  context.translate(-cx, -cy);
}

function drawTextBlock(
  context: CanvasRenderingContext2D,
  block: TextBlock,
  node: SceneNode,
  x: number,
  y: number,
  width: number,
  scale: number,
): void {
  context.fillStyle = node.fill;
  context.font = `400 ${block.fontSize * scale}px ${node.fontFamily}`;
  context.textBaseline = "top";
  const align = node.placement.style?.align ?? node.layer.style?.align ?? "left";
  context.textAlign = align === "center" ? "center" : align === "right" ? "right" : "left";
  const textX = align === "center" ? x + width / 2 : align === "right" ? x + width : x;
  block.lines.forEach((line, index) => {
    context.fillText(line, textX * scale, (y + index * block.lineHeight) * scale);
  });
}

async function drawImageNode(
  context: CanvasRenderingContext2D,
  node: SceneNode,
  bundle: CampaignBundle,
  scale: number,
): Promise<void> {
  const value = node.value;
  const asset = value && typeof value === "object" && !Array.isArray(value)
    ? bundle.campaign.assets.find((item) => item.id === value.assetId)
    : undefined;
  const bytes = asset && bundle.assets.get(asset.path);
  if (!asset || !bytes || !["image/png", "image/jpeg"].includes(asset.mimeType)) return;

  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: asset.mimeType }));
  try {
    const image = await loadImage(url);
    const frame = node.placement.frame;
    const fit = node.placement.imageFit ?? { mode: "cover", focalX: 0.5, focalY: 0.5 };
    const frameRatio = frame.width / frame.height;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    let sx = 0, sy = 0, sw = image.naturalWidth, sh = image.naturalHeight;

    if (fit.mode === "cover") {
      if (imageRatio > frameRatio) {
        sw = image.naturalHeight * frameRatio;
        sx = (image.naturalWidth - sw) * fit.focalX;
      } else {
        sh = image.naturalWidth / frameRatio;
        sy = (image.naturalHeight - sh) * fit.focalY;
      }
      context.drawImage(image, sx, sy, sw, sh,
        frame.x * scale, frame.y * scale, frame.width * scale, frame.height * scale);
    } else {
      const ratio = Math.min(frame.width / image.naturalWidth, frame.height / image.naturalHeight);
      const dw = image.naturalWidth * ratio, dh = image.naturalHeight * ratio;
      const dx = frame.x + (frame.width - dw) * fit.focalX;
      const dy = frame.y + (frame.height - dh) * fit.focalY;
      context.drawImage(image, dx * scale, dy * scale, dw * scale, dh * scale);
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function drawNode(
  context: CanvasRenderingContext2D,
  node: SceneNode,
  bundle: CampaignBundle,
  scale: number,
): Promise<void> {
  const frame = node.placement.frame;
  context.save();
  applyRotation(context, node, scale);

  if (node.layer.type === "shape") {
    context.fillStyle = node.fill;
    if (node.layer.shape === "ellipse") {
      context.beginPath();
      context.ellipse(
        (frame.x + frame.width / 2) * scale,
        (frame.y + frame.height / 2) * scale,
        frame.width * scale / 2,
        frame.height * scale / 2,
        0, 0, Math.PI * 2,
      );
      context.fill();
    } else {
      context.fillRect(frame.x * scale, frame.y * scale, frame.width * scale, frame.height * scale);
    }
  } else if (node.layer.type === "image") {
    context.beginPath();
    context.rect(frame.x * scale, frame.y * scale, frame.width * scale, frame.height * scale);
    context.clip();
    await drawImageNode(context, node, bundle, scale);
  } else if (node.text) {
    drawTextBlock(context, node.text, node, frame.x, frame.y, frame.width, scale);
  } else if (node.rows) {
    for (const row of node.rows) {
      for (const cell of row.cells) {
        drawTextBlock(
          context,
          cell.text,
          node,
          frame.x + cell.frame.x,
          frame.y + row.y + cell.frame.y,
          cell.frame.width,
          scale,
        );
      }
    }
  }

  context.restore();
}

export async function exportSceneAsPng(
  nodes: SceneNode[],
  bundle: CampaignBundle,
  logicalWidth: number,
  logicalHeight: number,
  outputWidth = logicalWidth,
  outputHeight = logicalHeight,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(outputWidth));
  canvas.height = Math.max(1, Math.round(outputHeight));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D indisponible dans ce navigateur.");

  const scaleX = canvas.width / logicalWidth;
  const scaleY = canvas.height / logicalHeight;
  if (Math.abs(scaleX - scaleY) > 0.001) throw new Error("Dimensions d'export incohérentes.");

  context.clearRect(0, 0, canvas.width, canvas.height);
  for (const node of nodes) await drawNode(context, node, bundle, scaleX);
  return await canvasToBlob(canvas);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
