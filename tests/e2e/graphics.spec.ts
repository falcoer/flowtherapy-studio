import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
async function open(page: Page) {
  await page.goto("/#graphique");
  await expect(
    page.getByText("Enregistré localement", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('canvas[aria-label="Composition WebGL"]')
        .evaluate((c: HTMLCanvasElement) => c.width),
    )
    .toBe(1080);
}
async function projectJSON(page: Page) {
  const [d] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Sauvegarder JSON" }).click(),
  ]);
  return JSON.parse(await readFile((await d.path())!, "utf8"));
}
test("WebGL composition, editing, undo and persistence with no browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await page.getByRole("button", { name: "T Titre principal" }).click();
  await page
    .getByLabel("Contenu du texte")
    .fill("Une création\nqui nous ressemble");
  await page.getByLabel("Rotation °").fill("12");
  await page.getByLabel("Couleur du renderer").fill("#aaffcc");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByLabel("Couleur du renderer")).toHaveValue("#fff7eb");
  await expect(
    page.getByText("Enregistré localement", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "T Titre principal" }).click();
  await expect(page.getByLabel("Contenu du texte")).toHaveValue(
    "Une création\nqui nous ressemble",
  );
  await expect(page.getByLabel("Rotation °")).toHaveValue("12");
  const p = await projectJSON(page);
  expect(
    p.renderers.find((r: any) => r.name === "Titre principal").rotation,
  ).toBe(12);
  expect(errors).toEqual([]);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
test("anchor midpoint snapping, drag and drop attachment, deletion and undo", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "⊕ Ancrage A", exact: true }).click();
  const stage = page.getByRole("application", {
    name: "Surface de composition",
  });
  const box = (await stage.boundingBox())!;
  // Middle of center (.5,.5) and title (.5,.27) is (.5,.385).
  await page.mouse.move(box.x + box.width * 0.505, box.y + box.height * 0.39);
  await expect(page.locator(".gx-snap text")).toHaveText("½ · ½");
  await page.mouse.click(box.x + box.width * 0.505, box.y + box.height * 0.39);
  await expect(page.getByLabel("Position Y %")).toHaveValue("38.5");
  const anchor = page.locator("[data-anchor]").last();
  const anchorId = await anchor.getAttribute("data-anchor");
  const data = await page.evaluateHandle(() => new DataTransfer());
  await data.evaluate((d) => d.setData("ft-preset", "halo"));
  await stage.dispatchEvent("drop", {
    dataTransfer: data,
    clientX: box.x + box.width * 0.5,
    clientY: box.y + box.height * 0.385,
  });
  await expect(page.getByLabel("Nom du renderer")).toHaveValue("Halo");
  await expect(page.getByLabel("Attaché à")).toHaveValue(anchorId!);
  await page.getByRole("button", { name: "⊕ Ancrage 4" }).click();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.385);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.42, {
    steps: 5,
  });
  await page.mouse.up();
  expect(
    Number(await page.getByLabel("Position X %").inputValue()),
  ).toBeGreaterThan(60);
  await page
    .getByRole("button", { name: "Supprimer l’ancrage et ses éléments" })
    .click();
  await expect(page.locator("[data-anchor]")).toHaveCount(3);
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.locator("[data-anchor]")).toHaveCount(4);
  const p = await projectJSON(page);
  expect(
    p.renderers.some((r: any) => r.name === "Halo" && r.anchorId === anchorId),
  ).toBe(true);
});
test("catalog customization round trip and invalid import preserve active document", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Configurer les formats" }).click();
  const editor = page.getByLabel("Définition du catalogue");
  const c = JSON.parse(await editor.inputValue());
  c.items.push({
    id: "test",
    name: "Carré test",
    width: 800,
    height: 800,
    dpi: 72,
  });
  await editor.fill(JSON.stringify(c));
  await page.getByRole("button", { name: "Appliquer le catalogue" }).click();
  await page.getByLabel("Format", { exact: true }).selectOption("test");
  await expect(page.locator(".gx-canvas-title")).toContainText("800 × 800");
  await page.getByRole("button", { name: "Configurer la palette" }).click();
  const palette = JSON.parse(await editor.inputValue());
  palette.items.push({
    ...palette.items[0],
    id: "custom",
    name: "Aurore menthe",
    style: { ...palette.items[0].style, color: "#aaffcc" },
  });
  await editor.fill(JSON.stringify(palette));
  await page.getByRole("button", { name: "Appliquer le catalogue" }).click();
  await expect(
    page.getByRole("button", { name: "Ajouter Aurore menthe" }),
  ).toBeVisible();
  await page.getByLabel("Importer une composition").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"kind":"ft-graphic-project","schemaVersion":99}'),
  });
  await expect(page.getByRole("alert")).toContainText("version");
  await expect(page.locator(".gx-canvas-title")).toContainText("800 × 800");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Sauvegarder JSON" }).click(),
  ]);
  const path = (await download.path())!;
  await page.getByLabel("Importer une composition").setInputFiles({
    name: "roundtrip.json",
    mimeType: "application/json",
    buffer: await readFile(path),
  });
  await expect(page.getByRole("alert")).toHaveCount(0);
});
test("PNG and deterministic frame ZIP contain real rendered images and timing", async ({
  page,
}) => {
  await open(page);
  const preview = await page
    .locator('canvas[aria-label="Composition WebGL"]')
    .evaluate((c: HTMLCanvasElement) => c.toDataURL("image/png").split(",")[1]);
  await page.getByRole("button", { name: "Exporter ↗" }).click();
  const [png] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Télécharger", exact: true }).click(),
  ]);
  const bytes = await readFile((await png.path())!);
  expect(bytes.readUInt32BE(16)).toBe(1080);
  expect(bytes.readUInt32BE(20)).toBe(1350);
  expect(bytes.length).toBeGreaterThan(10000);
  expect(Buffer.compare(bytes, Buffer.from(preview, "base64"))).toBe(0);
  await page.getByLabel("Type d’export").selectOption("sequence");
  await page.getByLabel("Durée (secondes)").fill("1");
  await page.getByLabel("Images par seconde").fill("3");
  await page.getByLabel("Résolution").selectOption("0.25");
  const [zip] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Télécharger", exact: true }).click(),
  ]);
  const entries = unzipSync(await readFile((await zip.path())!));
  const manifest = JSON.parse(strFromU8(entries["manifest.json"]));
  expect(manifest.frames).toBe(3);
  expect(manifest.fps).toBe(3);
  expect(manifest.width).toBe(270);
  expect(Object.keys(entries).filter((k) => k.endsWith(".png"))).toHaveLength(
    3,
  );
  expect(
    Buffer.compare(
      Buffer.from(entries["frames/frame-00000.png"]),
      Buffer.from(entries["frames/frame-00002.png"]),
    ),
  ).not.toBe(0);
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveCount(0);
});
test("video export produces a decodable clip with expected dimensions", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Exporter ↗" }).click();
  await page.getByLabel("Type d’export").selectOption("video");
  await page.getByLabel("Résolution").selectOption("0.25");
  await page.getByLabel("Durée (secondes)").fill("1");
  const [video] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Télécharger", exact: true }).click(),
  ]);
  const bytes = await readFile((await video.path())!);
  expect(bytes.length).toBeGreaterThan(2000);
  const info = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const v = document.createElement("video");
    v.muted = true;
    v.src = URL.createObjectURL(new Blob([bytes], { type: "video/webm" }));
    await new Promise<void>((resolve, reject) => {
      v.onloadeddata = () => resolve();
      v.onerror = () => reject(new Error("Invalid video"));
    });
    const result = { width: v.videoWidth, height: v.videoHeight };
    URL.revokeObjectURL(v.src);
    return result;
  }, bytes.toString("base64"));
  expect(info).toEqual({ width: 270, height: 338 });
});

test("image library import, selection, shared reuse and portable project survive reload", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "▧ Image 1", exact: true }).click();
  await page
    .getByRole("button", { name: "Parcourir / importer une image" })
    .click();
  const fixture = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 80;
    c.height = 40;
    const g = c.getContext("2d")!;
    g.fillStyle = "#ff0000";
    g.fillRect(0, 0, 40, 40);
    g.fillStyle = "#0000ff";
    g.fillRect(40, 0, 40, 40);
    return c.toDataURL().split(",")[1];
  });
  await page.getByLabel("Droits / provenance").fill("Fixture de test");
  await page.getByLabel("Importer une image", { exact: true }).setInputFiles({
    name: "test-graphic.png",
    mimeType: "image/png",
    buffer: Buffer.from(fixture, "base64"),
  });
  await expect(
    page.getByRole("dialog").getByText("test-graphic.png", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fermer la boîte" }).click();
  await expect(page.getByLabel("Image de la bibliothèque")).toContainText(
    "test-graphic.png",
  );
  const data = await projectJSON(page);
  const image = data.renderers.find((r: any) => r.kind === "image");
  expect(data.assets.find((a: any) => a.id === image.assetId).name).toBe(
    "test-graphic.png",
  );
  await page
    .getByRole("button", { name: "Parcourir / importer une image" })
    .click();
  await expect(page.locator(".gx-library-list")).toContainText(
    "test-graphic.png",
  );
  await page.getByRole("button", { name: "Fermer la boîte" }).click();
  await expect(
    page.getByText("Enregistré localement", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "▧ Image 1", exact: true }).click();
  await expect(page.getByLabel("Image de la bibliothèque")).toHaveValue(
    image.assetId,
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
});
