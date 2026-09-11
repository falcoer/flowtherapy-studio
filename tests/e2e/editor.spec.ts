import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { importJSON } from "../../src/storage/json.js";
import { importZIP } from "../../src/storage/archive.js";

const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error") errors.push(e.text());
  });
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

async function compose(page: Page) {
  await page.goto("/");
  await page
    .getByLabel("Nom de la campagne", { exact: true })
    .fill("Campagne de recette");
  await page.getByRole("button", { name: "+ Ajouter un événement" }).click();
  await page.getByLabel("Date 1", { exact: true }).fill("2026-10-17");
  await page.getByLabel("Libellé 1", { exact: true }).fill("Concert fictif");
  await page.getByLabel("Lieu 1", { exact: true }).fill("Ville exemple");
  await page.getByRole("button", { name: "Activer le template" }).click();
  await expect(
    page.getByRole("button", { name: "Calque title", exact: true }),
  ).toBeVisible();
}
async function exportData(page: Page, kind: "JSON" | "ZIP") {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: `Exporter ${kind}` }).click();
  const file = await download;
  return readFile((await file.path())!);
}
test("create, edit, move, undo, save, reload and portable JSON/ZIP", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await compose(page);
  await page.screenshot({
    path: "test-results/studio-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Position X", { exact: true }).fill("200");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByLabel("Position X", { exact: true })).toHaveValue(
    "86.4",
  );
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  await expect(page.getByLabel("Position X", { exact: true })).toHaveValue(
    "200",
  );
  const title = page.getByRole("button", { name: "Calque title", exact: true });
  await title.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Position X", { exact: true })).toHaveValue(
    "201",
  );
  const bounds = (await title.boundingBox())!;
  await page.mouse.move(bounds.x + 20, bounds.y + 10);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 50, bounds.y + 30);
  await page.mouse.up();
  expect(
    Number(await page.getByLabel("Position X", { exact: true }).inputValue()),
  ).toBeGreaterThan(201);
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("révision 1");
  const json = importJSON((await exportData(page, "JSON")).toString());
  expect(json.name).toBe("Campagne de recette");
  expect(
    json.supports[0].variants[0].placementOverrides.title.frame!.x,
  ).toBeGreaterThan(201);
  const zip = await exportData(page, "ZIP");
  expect((await importZIP(zip)).campaign.id).toBe(json.id);
  await page.reload();
  page.on("dialog", (d) => d.accept());
  await page.getByLabel("Campagne enregistrée").selectOption(json.id);
  await page.getByRole("button", { name: "Ouvrir", exact: true }).click();
  await expect(
    page.getByLabel("Nom de la campagne", { exact: true }),
  ).toHaveValue("Campagne de recette");
  await page.getByLabel("Importer JSON ou ZIP").setInputFiles({
    name: "backup.zip",
    mimeType: "application/zip",
    buffer: zip,
  });
  await expect(page.getByRole("status")).toContainText(
    "Importé comme nouvelle campagne",
  );
  await expect(page.getByLabel("Libellé 1", { exact: true })).toHaveValue(
    "Concert fictif",
  );
  await page.getByLabel("Date 1", { exact: true }).fill("");
  await expect(
    page.getByRole("button", { name: "Enregistrer", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(errors).toEqual([]);
});
test("image crop, binary reload, round trip and same-origin revision conflict", async ({
  page,
  context,
}) => {
  await compose(page);
  const png = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 100;
    const g = c.getContext("2d")!;
    g.fillStyle = "red";
    g.fillRect(0, 0, 200, 100);
    g.fillStyle = "blue";
    g.fillRect(200, 0, 200, 100);
    return c.toDataURL().split(",")[1];
  });
  await page
    .getByLabel("Droits / autorisation")
    .fill("Fixture créée par le test");
  await page.getByLabel("Image PNG ou JPEG").setInputFiles({
    name: "fixture.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await expect(
    page.getByRole("img", { name: "Image de la composition" }),
  ).toBeVisible();
  await page.getByLabel("Cadrage horizontal").fill("0.2");
  await expect(page.getByRole("img")).toHaveCSS("object-position", "20% 50%");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByRole("img")).toHaveCSS("object-position", "50% 50%");
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("révision 1");
  const zip = await exportData(page, "ZIP"),
    restored = await importZIP(zip),
    id = restored.campaign.id;
  expect(restored.assets.size).toBe(1);
  const other = await context.newPage();
  await other.goto("/");
  other.on("dialog", (d) => d.accept());
  await other.getByLabel("Campagne enregistrée").selectOption(id);
  await other.getByRole("button", { name: "Ouvrir", exact: true }).click();
  await expect(other.getByRole("img")).toHaveCSS("object-position", "20% 50%");
  await page
    .getByLabel("Nom de la campagne", { exact: true })
    .fill("Version A");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("révision 2");
  await other
    .getByLabel("Nom de la campagne", { exact: true })
    .fill("Version B");
  await other.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(other.getByRole("alert")).toContainText("autre onglet");
  await other
    .getByRole("button", { name: "Enregistrer une copie", exact: true })
    .click();
  await expect(other.getByRole("status")).toContainText("révision 1");
  await expect(
    other.getByLabel("Nom de la campagne", { exact: true }),
  ).toHaveValue("Version B — copie");
});
test("mobile and overflowing content remain accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await compose(page);
  await page
    .getByLabel("Titre de la campagne")
    .fill("Un très long titre de campagne ".repeat(30));
  await expect(
    page.getByRole("list", { name: "Avertissements de composition" }),
  ).toContainText("contenu débordant");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const json = importJSON((await exportData(page, "JSON")).toString());
  expect((json.content.title as string).length).toBeGreaterThan(500);
});
