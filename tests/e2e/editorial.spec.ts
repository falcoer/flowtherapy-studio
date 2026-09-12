import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { importJSON } from "../../src/storage/json.js";
import { importZIP } from "../../src/storage/archive.js";

async function start(page: Page) {
  page.on("dialog", (d) => d.accept());
  await page.goto("/#editorial");
  await expect(
    page.getByLabel("Titre du contenu", { exact: true }),
  ).toBeVisible();
}
async function saveArticle(page: Page, title = "Coulisses fictives") {
  await page.getByLabel("Titre du contenu", { exact: true }).fill(title);
  await page
    .getByLabel("Résumé du contenu")
    .fill("Un résumé court pour nos supports.");
  await page
    .getByLabel("Corps du contenu")
    .fill(
      "## La soirée\nUn texte **complet** et *illustré*.\n- Un détail fictif",
    );
  await page.getByLabel("Thèmes du contenu").fill("Concert, Musique");
  await page.getByLabel("Statut du contenu").selectOption("ready");
  await page
    .getByRole("button", { name: "Enregistrer le contenu", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("révision 1");
}
async function download(page: Page, button: string) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: button, exact: true }).click();
  const file = await pending;
  return readFile((await file.path())!);
}
async function importImage(page: Page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 64;
    const g = canvas.getContext("2d")!;
    g.fillStyle = "#173943";
    g.fillRect(0, 0, 96, 64);
    g.fillStyle = "#f09d50";
    g.fillRect(16, 16, 64, 32);
    return canvas.toDataURL().split(",")[1];
  });
  await page.getByText("Importer des ressources", { exact: true }).click();
  await page
    .getByLabel("Droits de la ressource", { exact: true })
    .fill("Image produite par le test");
  await page
    .getByLabel("Crédit de la ressource", { exact: true })
    .fill("Équipe fictive");
  await page
    .getByLabel("Fichier à importer", { exact: true })
    .setInputFiles({
      name: "fixture.png",
      mimeType: "image/png",
      buffer: Buffer.from(base64, "base64"),
    });
  await expect(page.getByRole("status")).toContainText("Ressource disponible");
}

test("write and illustrate an article, bind a detached campaign snapshot and preserve both ZIPs", async ({
  page,
}) => {
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url()) && new URL(r.url()).hostname !== "127.0.0.1")
      external.push(r.url());
  });
  await start(page);
  await page.getByRole("button", { name: "Médiathèque", exact: true }).click();
  await importImage(page);
  await expect(
    page.getByRole("img", { name: "fixture.png", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Rechercher une ressource").fill("equipe");
  await expect(
    page.getByRole("img", { name: "fixture.png", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Contenus", exact: true }).click();
  await page
    .getByLabel("Titre du contenu", { exact: true })
    .fill("Coulisses fictives");
  await page
    .getByRole("button", { name: "Choisir des images dans la médiathèque" })
    .click();
  await page
    .getByRole("button", { name: "Associer fixture.png", exact: true })
    .click();
  await saveArticle(page);
  await expect(page.locator(".editorial-prose strong")).toHaveText("complet");
  await page.screenshot({
    path: "test-results/editorial-desktop.png",
    fullPage: true,
  });
  const editorialZIP = await download(page, "Exporter le contenu ZIP");
  const original = (await importZIP(editorialZIP)).campaign.editorial![0];
  expect(original.tags).toEqual(["Concert", "Musique"]);
  expect(original.assets).toHaveLength(1);
  await page
    .getByRole("button", { name: "Ajouter ce contenu à la campagne" })
    .click();
  await expect(page.getByRole("status")).toContainText("révision ajoutée");
  await page.getByRole("button", { name: "Campagnes", exact: true }).click();
  await page
    .getByLabel("Template", { exact: true })
    .selectOption("ft:editorial-note");
  await page
    .getByRole("button", { name: "Activer le template", exact: true })
    .click();
  await expect(page.locator('[data-layer="title"]')).toHaveText(
    "Coulisses fictives",
  );
  await expect(page.locator('[data-layer="body"]')).toContainText(
    "Un texte complet et illustré.",
  );
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  const campaignZIP = await download(page, "Exporter ZIP");
  const bundle = await importZIP(campaignZIP);
  expect(bundle.campaign.editorial![0].body).toBe(original.body);
  expect(bundle.assets.size).toBe(1);
  await page.getByRole("button", { name: "Éditorial", exact: true }).click();
  await page
    .getByLabel("Corps du contenu")
    .fill("Une nouvelle révision du texte.");
  await page
    .getByRole("button", { name: "Enregistrer le contenu", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("révision 2");
  await page.getByRole("button", { name: "Campagnes", exact: true }).click();
  await expect(page.locator('[data-layer="body"]')).toContainText(
    "Un texte complet et illustré.",
  );
  await page
    .getByLabel("Contenu pour Texte", { exact: true })
    .selectOption({ label: "Coulisses fictives · Résumé · r1" });
  await expect(page.locator('[data-layer="body"]')).toHaveText(
    "Un résumé court pour nos supports.",
  );
  await page.getByRole("button", { name: "Éditorial", exact: true }).click();
  await page.getByRole("button", { name: "Médiathèque", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Insérer fixture.png dans le support",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText("Image insérée");
  await page.getByRole("button", { name: "Campagnes", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Image de la composition" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("editorial event selection drives the agenda in explicit order", async ({
  page,
}) => {
  await start(page);
  for (let index = 1; index <= 2; index++) {
    await page
      .getByRole("button", { name: "Nouveau contenu", exact: true })
      .click();
    await page.getByLabel("Type de contenu").selectOption("event");
    await page
      .getByLabel("Titre du contenu", { exact: true })
      .fill(`Concert fictif ${index}`);
    await page
      .getByLabel("Date de l’événement", { exact: true })
      .fill(`2026-10-2${index}`);
    await page
      .getByLabel("Lieu de l’événement", { exact: true })
      .fill("Ville exemple");
    await page.getByLabel("Statut du contenu").selectOption("ready");
    await page
      .getByRole("button", { name: "Enregistrer le contenu", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("révision 1");
  }
  await page.getByRole("button", { name: "Campagnes", exact: true }).click();
  await page.getByRole("button", { name: "Actualiser l’éditorial" }).click();
  await page
    .getByLabel("Contenu éditorial à sélectionner")
    .selectOption({ label: "Concert fictif 2 · Événement · r1" });
  await page
    .getByRole("button", { name: "Sélectionner le contenu", exact: true })
    .click();
  await expect(page.locator(".editorial-selection")).toHaveCount(1);
  await page
    .getByLabel("Contenu éditorial à sélectionner")
    .selectOption({ label: "Concert fictif 1 · Événement · r1" });
  await page
    .getByRole("button", { name: "Sélectionner le contenu", exact: true })
    .click();
  await expect(page.locator(".editorial-selection")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Activer le template", exact: true })
    .click();
  await expect(page.locator('[data-event-field="label"]')).toHaveText([
    "Concert fictif 2",
    "Concert fictif 1",
  ]);
  await page
    .getByRole("button", { name: "Monter le contenu 2", exact: true })
    .click();
  await expect(page.locator('[data-event-field="label"]')).toHaveText([
    "Concert fictif 1",
    "Concert fictif 2",
  ]);
  const json = importJSON((await download(page, "Exporter JSON")).toString());
  expect(json.schemaVersion).toBe(3);
  expect(json.content.events).toEqual([]);
  expect(json.editorial).toHaveLength(2);
});

test("restore article backups, filter archived entries and keep mobile/HTML input safe", async ({
  page,
}) => {
  await start(page);
  await saveArticle(page);
  const backup = await download(page, "Exporter le contenu ZIP");
  await page
    .getByLabel("Restaurer un contenu ZIP")
    .setInputFiles({
      name: "article.zip",
      mimeType: "application/zip",
      buffer: backup,
    });
  await expect(page.getByRole("status")).toContainText("nouvelle copie locale");
  await expect(page.locator(".editorial-card")).toHaveCount(2);
  await page
    .getByLabel("Titre du contenu", { exact: true })
    .fill("Article archivé");
  await page.getByLabel("Statut du contenu").selectOption("archived");
  await page
    .getByRole("button", { name: "Enregistrer le contenu", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("révision 2");
  await page.getByLabel("Filtrer par statut").selectOption("archived");
  await expect(page.locator(".editorial-card")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Ajouter ce contenu à la campagne" }),
  ).toBeDisabled();
  await page
    .getByLabel("Corps du contenu")
    .fill(
      '<img src="https://example.invalid/unsafe" onerror="window.injected=true">\n**Texte**',
    );
  await expect(page.locator(".editorial-prose img")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { injected?: boolean }).injected,
    ),
  ).toBeUndefined();
  await expect(page.locator(".editorial-prose")).toContainText("<img src=");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/editorial-mobile.png",
    fullPage: true,
  });
});

test("editorial conflicts retain the draft and permit a new copy", async ({
  page,
  context,
}) => {
  await start(page);
  await saveArticle(page);
  const other = await context.newPage();
  await start(other);
  await other
    .getByRole("button", { name: /Coulisses fictives.*Révision 1/ })
    .click();
  await page.getByLabel("Corps du contenu").fill("Version A.");
  await page
    .getByRole("button", { name: "Enregistrer le contenu", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("révision 2");
  await other.getByLabel("Corps du contenu").fill("Version B à conserver.");
  await other
    .getByRole("button", { name: "Enregistrer le contenu", exact: true })
    .click();
  await expect(other.getByRole("alert")).toContainText("autre onglet");
  await expect(other.getByLabel("Corps du contenu")).toHaveValue(
    "Version B à conserver.",
  );
  await other
    .getByRole("button", {
      name: "Enregistrer une copie du contenu",
      exact: true,
    })
    .click();
  await expect(other.getByRole("status")).toContainText("révision 1");
  await expect(other.locator(".editorial-card")).toHaveCount(2);
});

test("resource metadata and complete library backup are usable independently of articles", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "Médiathèque", exact: true }).click();
  await importImage(page);
  await page
    .getByRole("button", {
      name: "Modifier les informations de fixture.png",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Nom de la ressource", { exact: true })
    .fill("Illustration de recette");
  await page
    .getByLabel("Crédit enregistré", { exact: true })
    .fill("Auteur du test");
  await page
    .getByRole("button", { name: "Enregistrer les informations", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Informations enregistrées",
  );
  await page.getByLabel("Rechercher une ressource").fill("introuvable");
  await page.getByText("Sauvegarder la médiathèque", { exact: true }).click();
  const bytes = await download(page, "Exporter la médiathèque ZIP");
  const bundle = await importZIP(bytes);
  expect(bundle.assets.size).toBe(1);
  expect(bundle.campaign.assets[0].source).toBe("Illustration de recette");
  await page
    .getByLabel("Restaurer des ressources ZIP")
    .setInputFiles({
      name: "resources.zip",
      mimeType: "application/zip",
      buffer: bytes,
    });
  await expect(page.getByRole("status")).toContainText("Ressources restaurées");
  await page.getByLabel("Rechercher une ressource").fill("");
  await expect(page.locator(".resource-card")).toHaveCount(1);
  await page.screenshot({
    path: "test-results/library-desktop.png",
    fullPage: true,
  });
});
