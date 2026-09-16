import { expect, test } from "@playwright/test";

test("PROTO-01 loads real assets, exposes three formats and exports PNG", async ({ page }) => {
  await page.goto("/#campagne");

  const launcher = page.getByRole("button", { name: "Tester PROTO-01" });
  await expect(launcher).toBeVisible();
  await launcher.click();

  await expect(page.getByRole("heading", { name: "PROTO-01 — Flow Therapy viability" })).toBeVisible();
  await expect(page.getByText("Les Insolites")).toBeVisible();
  await expect(page.locator('.resolved-surface img')).toHaveCount(4);

  const variants = page.getByLabel("Variante active");
  await expect(variants.locator("option")).toHaveCount(3);
  await expect(variants.locator("option").nth(0)).toHaveText("SQUARE");
  await expect(variants.locator("option").nth(1)).toHaveText("STORY");
  await expect(variants.locator("option").nth(2)).toHaveText("A4");

  await expect(page.locator("[data-export-png]" )).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("[data-export-png]").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("prototype-square");

  await variants.selectOption("prototype:story");
  await expect(page.locator("[data-export-png]" )).toBeEnabled();
  await variants.selectOption("prototype:a4");
  await expect(page.locator("[data-export-png]" )).toBeEnabled();
});
