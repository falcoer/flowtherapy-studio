import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { importZIP } from "../../src/storage/archive.js";

test("legacy brand roles, resources and identity backup stay reachable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#branding");
  await page.getByRole("button", { name: "Outils historiques" }).click();
  await page.getByLabel("Nom de l’identité").fill("Marque de recette");
  await page.getByLabel("Accent", { exact: true }).fill("#aa33bb");
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#aa33bb";
    ctx.fillRect(0, 0, 16, 16);
    return c.toDataURL().split(",")[1];
  });
  await page.getByLabel("Crédit", { exact: true }).fill("Auteur fictif");
  await page.getByLabel("Droits d’utilisation").fill("Création de test");
  const file = {
    name: "logo-test.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  };
  await page
    .getByLabel("Importer une ressource", { exact: true })
    .setInputFiles(file);
  await expect(page.locator(".resource-list li")).toHaveCount(1);
  await page
    .getByLabel("Importer une ressource", { exact: true })
    .setInputFiles(file);
  await expect(page.getByRole("status")).toContainText("Ressource disponible");
  await expect(page.locator(".resource-list li")).toHaveCount(1);
  await page
    .getByLabel("Logo — Principal", { exact: true })
    .selectOption({ label: "logo-test.png" });
  await page
    .getByRole("button", { name: "Enregistrer l’identité", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Identité enregistrée.");
  const backupEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter l’identité ZIP" }).click();
  const backup = await readFile((await (await backupEvent).path())!);
  expect((await importZIP(backup)).assets.size).toBe(1);
  await page.getByRole("button", { name: "Appliquer à la campagne" }).click();
  await expect(page.getByRole("status")).toContainText("Identité appliquée");
  await page.getByLabel("Accent", { exact: true }).fill("#001122");
  await page
    .getByRole("button", { name: "Enregistrer l’identité", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Identité enregistrée.");
  await page.getByRole("button", { name: "Campagnes", exact: true }).click();
  await page.getByRole("button", { name: "+ Ajouter un événement" }).click();
  await page.getByLabel("Libellé 1", { exact: true }).fill("Concert fictif");
  await page.getByLabel("Lieu 1", { exact: true }).fill("Ville exemple");
  await page.getByRole("button", { name: "Activer le template" }).click();
  await page.getByRole("button", { name: "Parcourir les ressources" }).click();
  await page
    .getByLabel("Image du studio")
    .selectOption({ label: "logo-test.png" });
  await page.getByRole("button", { name: "Utiliser cette image" }).click();
  await expect(
    page.getByRole("img", { name: "Image de la composition" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("révision 1");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter ZIP", exact: true }).click();
  const saved = await importZIP(
    await readFile((await (await downloadEvent).path())!),
  );
  expect(saved.assets.size).toBe(1);
  expect(saved.campaign.brand!.colors.accent).toBe("#aa33bb");
  expect(saved.campaign.assets[0].credit).toBe("Auteur fictif");
  await page.getByRole("button", { name: "Branding", exact: true }).click();
  await page.getByRole("button", { name: "Outils historiques" }).click();
  await page.getByLabel("Importer une identité ZIP").setInputFiles({
    name: "branding.zip",
    mimeType: "application/zip",
    buffer: backup,
  });
  await expect(page.getByRole("status")).toContainText("Identité importée");
  await expect(page.getByLabel("Accent", { exact: true })).toHaveValue(
    "#aa33bb",
  );
  await page
    .getByRole("button", { name: "Enregistrer l’identité", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Identité enregistrée.");
  await page.reload();
  await page.getByRole("button", { name: "Outils historiques" }).click();
  await expect(page.getByLabel("Nom de l’identité")).toHaveValue(
    "Marque de recette",
  );
  await expect(
    page
      .getByLabel("Logo — Principal", { exact: true })
      .locator("option:checked"),
  ).toHaveText("logo-test.png");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("legacy Flow Therapy font kit remains reachable", async ({ page }) => {
  await page.goto("/#branding");
  await page.getByRole("button", { name: "Outils historiques" }).click();
  await page
    .getByRole("button", { name: "Importer les polices du site" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "polices du site ont été importées",
  );
  await expect(page.locator(".resource-list li")).toHaveCount(4);
  await expect(
    page.getByLabel("Police — Titres").locator("option:checked"),
  ).toHaveText("Bangers-Regular.ttf");
  await expect(
    page.getByLabel("Police — Corps").locator("option:checked"),
  ).toHaveText("Inter-Variable.ttf");
  await expect(
    page.getByLabel("Police — Légendes").locator("option:checked"),
  ).toHaveText("Kalam-Regular.ttf");
});
