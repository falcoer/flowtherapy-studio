import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { importBrandConfiguration } from "../../src/storage/brand-configuration.js";

test("brand draft, impact, release and explicit campaign migration", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#branding");

  await expect(page.getByRole("heading", { name: "Flow Therapy — Site internet" })).toBeVisible();
  await expect(page.getByText("Release 1", { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel("Valeur color.primary")).toHaveValue("#168AD5");

  await page.getByRole("button", { name: "Utiliser release 1" }).click();
  await expect(page.getByRole("status")).toContainText("Release 1 appliquée");

  await page.getByLabel("Valeur color.primary").fill("#0055AA");
  await expect(page.getByText("1 changement(s) dans le brouillon")).toBeVisible();
  await expect(page.locator(".impact-change")).toContainText("#168AD5 → #0055AA");
  await expect(page.locator(".impact-count")).not.toHaveText("0");
  await expect(
    page.getByText("Concert illustré — Flow Therapy", { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page.getByRole("status")).toContainText("Brouillon enregistré localement");
  await page.getByRole("button", { name: "Publier la release" }).click();
  await expect(page.getByRole("status")).toContainText("Release 2 publiée");
  await expect(page.getByRole("button", { name: "Migrer vers release 2" })).toBeVisible();

  const exportEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter", exact: true }).click();
  const exportedPath = await (await exportEvent).path();
  const configuration = importBrandConfiguration(
    await readFile(exportedPath!, "utf8"),
  );
  expect(configuration.releases).toHaveLength(2);
  expect(configuration.releases[1].objects.find((object) => object.id === "color.primary")?.value).toBe(
    "#0055AA",
  );
  expect(configuration.releases[1].fingerprint).toMatch(/^fnv1a-/);

  await page.getByRole("button", { name: "Migrer vers release 2" }).click();
  await expect(page.getByRole("status")).toContainText("migrée dans l’éditeur");
  await expect(page.getByRole("button", { name: "Campagne alignée sur release 2" })).toBeDisabled();

  await page.reload();
  await expect(page.getByText("Release 2", { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel("Valeur color.primary")).toHaveValue("#0055AA");

  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/brand-configuration-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("theme switch remains independent from brand releases", async ({ page }) => {
  await page.goto("/#branding");
  const theme = page.getByRole("button", { name: "Activer le thème sombre" });
  await expect(theme).toHaveAttribute("aria-pressed", "false");
  await theme.click();
  await expect(
    page.getByRole("button", { name: "Activer le thème clair" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByText("MARQUE / CONFIGURATION", { exact: true })).toBeVisible();
});
