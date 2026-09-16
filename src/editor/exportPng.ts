function collectDocumentStyles(): string {
  const css: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) css.push(rule.cssText);
    } catch {
      // Cross-origin stylesheets are intentionally ignored. The Studio serves its
      // application styles locally, so this is only a defensive fallback.
    }
  }
  return css.join("\n");
}

async function blobUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Impossible de lire une image de la scène (${response.status}).`);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Lecture de l'image impossible."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

async function inlineImages(source: HTMLElement, clone: HTMLElement): Promise<void> {
  const sourceImages = Array.from(source.querySelectorAll("img"));
  const cloneImages = Array.from(clone.querySelectorAll("img"));
  await Promise.all(sourceImages.map(async (image, index) => {
    const target = cloneImages[index];
    if (!target || !image.src) return;
    target.src = image.src.startsWith("data:") ? image.src : await blobUrlToDataUrl(image.src);
  }));
}

function sanitizeClone(clone: HTMLElement): void {
  clone.style.transform = "none";
  clone.style.transformOrigin = "0 0";
  clone.querySelectorAll(".selected").forEach((node) => node.classList.remove("selected"));
  clone.querySelectorAll<HTMLElement>("[data-layer]").forEach((node) => {
    node.style.outlineWidth = "0";
    node.style.cursor = "default";
  });
  clone.querySelectorAll(".scene-guides").forEach((node) => node.remove());
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Le navigateur n'a pas pu rasteriser la scène SVG."));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("Le navigateur n'a pas produit le PNG.")),
    "image/png",
  ));
}

export async function exportSurfaceAsPng(
  surface: HTMLElement,
  logicalWidth: number,
  logicalHeight: number,
  outputWidth = logicalWidth,
  outputHeight = logicalHeight,
): Promise<Blob> {
  const clone = surface.cloneNode(true) as HTMLElement;
  sanitizeClone(clone);
  await inlineImages(surface, clone);

  const markup = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${logicalWidth} ${logicalHeight}">
    <foreignObject x="0" y="0" width="${logicalWidth}" height="${logicalHeight}">
      <div xmlns="http://www.w3.org/1999/xhtml" style="width:${logicalWidth}px;height:${logicalHeight}px;overflow:hidden">
        <style>${collectDocumentStyles()}</style>
        ${markup}
      </div>
    </foreignObject>
  </svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(outputWidth));
    canvas.height = Math.max(1, Math.round(outputHeight));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D indisponible dans ce navigateur.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await canvasToBlob(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
