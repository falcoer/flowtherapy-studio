import { test, expect } from "@playwright/test";

test("website branding loads locally, renders its assets and preserves a saved identity", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== "127.0.0.1") external.push(request.url());
  });
  await page.goto("/#branding");
  await expect(page.getByLabel("Nom de l’identité")).toHaveValue("Flow Therapy — identité du site · Claire");
  await expect(page.getByLabel("Fond", { exact: true })).toHaveValue("#fbf8f2");
  const specimen = page.getByRole("region", { name: "Aperçu de l’identité" });
  await expect.poll(() => specimen.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect.poll(() => specimen.locator("h2").evaluate((element) => getComputedStyle(element).fontFamily)).toContain("StudioBrand_");
  await expect(page.getByRole("button", { name: "Appliquer à la campagne", exact: true })).toBeDisabled();
  await page.getByLabel("Nom de l’identité").fill("Identité personnalisée conservée");
  await page.getByRole("button", { name: "Enregistrer l’identité", exact: true }).click();
  await expect(page.getByText("Identité enregistrée.", { exact: true })).toBeVisible();
  await page.route("**/branding/flowtherapy-website/*.zip", (route) => route.abort());
  await page.reload();
  await expect(page.getByLabel("Nom de l’identité")).toHaveValue("Identité personnalisée conservée");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(external).toEqual([]);
});

test("dark preset replacement is explicit and remains a draft", async ({ page }) => {
  await page.goto("/#branding");
  await expect(page.getByLabel("Nom de l’identité")).toHaveValue("Flow Therapy — identité du site · Claire");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Charger Flow Therapy — sombre" }).click();
  await expect(page.getByLabel("Fond", { exact: true })).toHaveValue("#fbf8f2");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Charger Flow Therapy — sombre" }).click();
  await expect(page.getByLabel("Nom de l’identité")).toHaveValue("Flow Therapy — identité du site · Sombre");
  await expect(page.getByLabel("Fond", { exact: true })).toHaveValue("#07101d");
  await expect(page.getByLabel("Violet", { exact: true })).toHaveValue("#9a48f0");
  await expect(page.getByRole("button", { name: "Appliquer à la campagne", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Enregistrer l’identité", exact: true }).click();
  await expect(page.getByText("Identité enregistrée.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Fond", { exact: true })).toHaveValue("#07101d");
});

test("catalogue failure is visible and does not block manual branding", async ({ page }) => {
  await page.route("**/branding/flowtherapy-website/*.zip", (route) => route.abort());
  await page.goto("/#branding");
  await expect(page.getByRole("alert")).toContainText("Le préréglage Flow Therapy n’a pas pu être chargé");
  await expect(page.getByRole("button", { name: "Enregistrer l’identité", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Nom de l’identité")).toBeEnabled();
});
