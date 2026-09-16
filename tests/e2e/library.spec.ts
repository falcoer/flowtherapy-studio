import { test, expect } from "@playwright/test";

test("library projects the shared resource catalogue and links to the single content workspace", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#branding");

  await page.getByRole("button", { name: "Outils historiques" }).click();
  await page.getByRole("button", { name: "Importer les polices du site" }).click();
  await expect(page.getByRole("status")).toContainText(
    "polices du site ont été importées",
  );

  await page.getByRole("button", { name: "Bibliothèque" }).click();
  await expect(
    page.getByRole("heading", { name: "Matière réutilisable du studio" }),
  ).toBeVisible();
  await expect(page.locator(".library-entry-list > button")).toHaveCount(4);

  await page.getByLabel("Rechercher une ressource", { exact: true }).fill("Bangers");
  await expect(page.locator(".library-entry-list > button")).toHaveCount(1);
  await page.locator(".library-entry-list > button").click();
  await expect(page.locator(".library-detail")).toContainText("Bangers-Regular.ttf");
  await expect(page.locator(".library-detail")).toContainText("font/ttf");
  await expect(page.locator(".library-usages")).toContainText("Dépendances");

  await page.getByRole("tab", { name: "Contenus" }).click();
  await expect(
    page.getByRole("heading", { name: "Contenus éditoriaux" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ouvrir les contenus éditoriaux" }).click();
  await expect(page.getByRole("heading", { name: "Éditorial" })).toBeVisible();

  await page.getByRole("button", { name: "Branding", exact: true }).click();
  await page.getByRole("button", { name: "Bibliothèque" }).click();
  await expect(page.getByLabel("Rechercher une ressource", { exact: true })).toHaveValue(
    "Bangers",
  );
  expect(errors).toEqual([]);
});
