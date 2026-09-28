import surfaces from "../../catalog/graphics/surfaces.json" with { type: "json" };
import renderers from "../../catalog/graphics/renderers.json" with { type: "json" };
import {
  parseCatalog,
  type Surface,
  type Preset,
  type Project,
  instantiate,
} from "./model.js";
export const defaultSurfaces = parseCatalog<Surface>(
  JSON.stringify(surfaces),
  "ft-surfaces",
);
export const defaultPalette = parseCatalog<Preset>(
  JSON.stringify(renderers),
  "ft-renderers",
);
/** Procedural fixture, no photograph or external resource. */
export function demoImage(): string {
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 600;
  const g = c.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, 600);
  sky.addColorStop(0, "#28223d");
  sky.addColorStop(0.5, "#d18e88");
  sky.addColorStop(1, "#f0b57c");
  g.fillStyle = sky;
  g.fillRect(0, 0, 900, 600);
  g.fillStyle = "#ffe1a1";
  g.beginPath();
  g.arc(640, 195, 76, 0, Math.PI * 2);
  g.fill();
  for (let layer = 0; layer < 4; layer++) {
    g.fillStyle = ["#63536a", "#474359", "#292c42", "#161d30"][layer];
    g.beginPath();
    g.moveTo(0, 600);
    for (let x = 0; x <= 900; x += 10)
      g.lineTo(
        x,
        300 +
          layer * 64 +
          45 * Math.sin(x / 130 + layer * 1.8) +
          20 * Math.sin(x / 53 + layer),
      );
    g.lineTo(900, 600);
    g.fill();
  }
  return c.toDataURL("image/png");
}
export function newProject(): Project {
  const p: Project = {
    kind: "ft-graphic-project",
    schemaVersion: 1,
    name: "Étude 01 — Résonance",
    surface: { ...defaultSurfaces.items[0] },
    background: "#101523",
    duration: 4,
    fps: 24,
    anchors: [
      { id: "a-center", name: "Centre", x: 0.5, y: 0.5 },
      { id: "a-title", name: "Titre", x: 0.5, y: 0.27 },
      { id: "a-image", name: "Paysage", x: 0.5, y: 0.68 },
    ],
    renderers: [],
    assets: [
      {
        id: "demo",
        name: "Horizon — illustration de démonstration",
        rights: "Illustration procédurale du prototype",
        dataUrl: demoImage(),
      },
    ],
  };
  const bg = instantiate(defaultPalette.items[0], "a-center", p);
  bg.name = "Aurore";
  p.renderers.push(bg);
  const photo = instantiate(defaultPalette.items[3], "a-image", p);
  photo.width = 850;
  photo.height = 440;
  photo.rotation = -5;
  p.renderers.push(photo);
  const text = instantiate(defaultPalette.items[4], "a-title", p);
  text.name = "Titre principal";
  text.text = "MAKE SOME\nNOISE.";
  text.fontSize = 162;
  p.renderers.push(text);
  const caption = instantiate(defaultPalette.items[4], "a-image", p);
  caption.name = "Signature";
  caption.text = "FLOW THERAPY  /  VISUAL EXPERIMENT";
  caption.font = "Inter";
  caption.fontSize = 23;
  caption.width = 980;
  caption.height = 50;
  caption.offsetY = 335;
  p.renderers.push(caption);
  return p;
}
