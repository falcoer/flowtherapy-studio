import { zipSync, strToU8 } from "fflate";
import { GraphicEngine } from "./engine.js";
import { parseProject, type Project } from "./model.js";
export const MAX_SEQUENCE_PIXELS = 180_000_000;
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function jsonDownload(value: unknown, name: string) {
  download(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
    name,
  );
}
export function png(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Export PNG impossible.")),
      "image/png",
    ),
  );
}
export function videoMime(): string | undefined {
  if (
    typeof MediaRecorder === "undefined" ||
    !HTMLCanvasElement.prototype.captureStream
  )
    return;
  return [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ].find((t) => MediaRecorder.isTypeSupported(t));
}
export function exportDimensions(p: Project, scale: number) {
  if (![0.25, 0.5, 1].includes(scale))
    throw new Error("Échelle d’export invalide.");
  return {
    width: Math.max(1, Math.round(p.surface.width * scale)),
    height: Math.max(1, Math.round(p.surface.height * scale)),
  };
}
export async function exportGraphic(
  input: Project,
  kind: "png" | "sequence" | "video",
  scale: number,
  time: number,
  progress: (n: number) => void,
  signal: AbortSignal,
): Promise<{ blob: Blob; name: string }> {
  const p = parseProject(JSON.stringify(input)),
    { width, height } = exportDimensions(p, scale);
  const frames = Math.round(p.duration * p.fps),
    name = p.name.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "composition";
  const abort = () => {
    if (signal.aborted) throw new DOMException("Export annulé.", "AbortError");
  };
  if (kind === "sequence" && width * height * frames > MAX_SEQUENCE_PIXELS)
    throw new Error(
      "Séquence trop lourde : réduisez la résolution, la durée ou la cadence (180 mégapixels cumulés maximum).",
    );
  if (kind === "video" && width * height > 8_300_000)
    throw new Error(
      "Vidéo limitée à 8,3 mégapixels par image. Réduisez la résolution.",
    );
  const canvas = document.createElement("canvas"),
    engine = new GraphicEngine(canvas);
  try {
    await engine.prepare(p);
    abort();
    engine.render(p, time, width, height);
    if (kind === "png") return { blob: await png(canvas), name: `${name}.png` };
    if (kind === "sequence") {
      const files: Record<string, Uint8Array> = {};
      for (let i = 0; i < frames; i++) {
        abort();
        engine.render(p, i / p.fps, width, height);
        files[`frames/frame-${String(i).padStart(5, "0")}.png`] =
          new Uint8Array(await (await png(canvas)).arrayBuffer());
        progress((i + 1) / frames);
        await new Promise((r) => setTimeout(r, 0));
      }
      files["manifest.json"] = strToU8(
        JSON.stringify(
          {
            schemaVersion: 1,
            fps: p.fps,
            frames,
            width,
            height,
            duration: frames / p.fps,
            timeOrigin: 0,
            source: p.name,
          },
          null,
          2,
        ),
      );
      abort();
      return {
        blob: new Blob([new Uint8Array(zipSync(files, { level: 0 }))], {
          type: "application/zip",
        }),
        name: `${name}-frames.zip`,
      };
    }
    const mime = videoMime();
    if (!mime)
      throw new Error(
        "Enregistrement vidéo indisponible ; utilisez la séquence PNG.",
      );
    engine.render(p, 0, width, height);
    const stream = canvas.captureStream(p.fps);
    try {
      const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 12_000_000,
      });
      const chunks: Blob[] = [];
      const blob = await new Promise<Blob>((resolve, reject) => {
        let raf = 0,
          timer: ReturnType<typeof setTimeout>;
        const cleanup = () => {
          cancelAnimationFrame(raf);
          clearTimeout(timer);
          signal.removeEventListener("abort", cancel);
        };
        const fail = (error: unknown) => {
          cleanup();
          if (recorder.state !== "inactive") recorder.stop();
          reject(error);
        };
        const cancel = () =>
          fail(new DOMException("Export annulé.", "AbortError"));
        recorder.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        recorder.onerror = () =>
          fail(
            new Error("Échec de l’encodeur vidéo. Utilisez la séquence PNG."),
          );
        recorder.onstop = () => {
          cleanup();
          if (signal.aborted)
            reject(new DOMException("Export annulé.", "AbortError"));
          else resolve(new Blob(chunks, { type: recorder.mimeType }));
        };
        signal.addEventListener("abort", cancel, { once: true });
        recorder.start();
        const start = performance.now();
        const tick = () => {
          try {
            const elapsed = (performance.now() - start) / 1000;
            engine.render(p, Math.min(elapsed, p.duration), width, height);
            progress(Math.min(1, elapsed / p.duration));
            if (elapsed >= p.duration) recorder.stop();
            else raf = requestAnimationFrame(tick);
          } catch (e) {
            fail(e);
          }
        };
        timer = setTimeout(
          () =>
            fail(
              new Error(
                "Enregistrement interrompu : gardez cet onglet visible.",
              ),
            ),
          p.duration * 1000 + 10000,
        );
        raf = requestAnimationFrame(tick);
      });
      if (!blob.size) throw new Error("Vidéo vide.");
      return { blob, name: `${name}.${mime.includes("mp4") ? "mp4" : "webm"}` };
    } finally {
      stream.getTracks().forEach((t) => t.stop());
    }
  } finally {
    engine.dispose();
  }
}
