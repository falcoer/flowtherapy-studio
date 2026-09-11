import { test, expect } from "@playwright/test";

const harness = "/tests/e2e/scene-harness.html";

test("resolved preview paginates every event once and preserves keyboard editing", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(harness);
  await expect(page.locator("[data-fonts-ready]")).toHaveAttribute("data-fonts-ready", "true");
  await expect(page.locator("[data-scene-page]")).toContainText("Page 1 /");
  const ids: string[] = [];
  do {
    ids.push(...await page.locator("[data-event-id]").evaluateAll((rows) => rows.map((row) => row.getAttribute("data-event-id")!)));
    if (await page.getByRole("button", { name: "Page suivante" }).isDisabled()) break;
    await page.getByRole("button", { name: "Page suivante" }).click();
  } while (ids.length < 30);
  expect(ids).toEqual(Array.from({ length: 20 }, (_, index) => `event-${index}`));
  const title = page.getByRole("button", { name: "Calque title", exact: true });
  await title.focus();
  await title.press("ArrowRight");
  await expect(title).toHaveCSS("left", "31px");
  await page.getByRole("button", { name: "Zones de sécurité" }).click();
  await expect(page.locator("[data-safe-area]")).toBeVisible();
  const pagination = await page.locator("[data-scene-page]").textContent();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("[data-scene-page]")).toHaveText(pagination!);
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
  expect(errors).toEqual([]);
});

test("campaign font is loaded locally, measured again and disposed on unmount", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => { if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== "127.0.0.1") external.push(request.url()); });
  await page.goto(harness);
  const title = page.locator('[data-layer="title"]');
  await page.getByRole("button", { name: "Police valid", exact: true }).click();
  await expect(title).toHaveCSS("font-family", /FTScene-/);
  await expect(page.locator("[data-fonts-ready]")).toHaveAttribute("data-fonts-ready", "true");
  const family = await title.evaluate((element) => getComputedStyle(element).fontFamily);
  expect(await page.evaluate((font) => document.fonts.check(`20px ${font}`), family)).toBe(true);
  await page.getByRole("button", { name: "Titre long" }).click();
  await expect(title).toHaveCSS("font-family", family);
  await expect(title).toContainText("sans perdre un seul mot");
  expect(await title.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeLessThan(60);
  const fontCount = () => page.evaluate(() => Array.from(document.fonts as unknown as Iterable<FontFace>).filter((face) => face.family.startsWith("FTScene-")).length);
  expect(await fontCount()).toBe(1);
  await page.getByRole("button", { name: "Basculer aperçu" }).click();
  await expect.poll(fontCount).toBe(0);
  expect(external).toEqual([]);
});

test("missing or corrupt font is reported and a restored local font recovers", async ({ page }) => {
  await page.goto(harness);
  await page.getByRole("button", { name: "Police missing", exact: true }).click();
  await expect(page.getByRole("list", { name: "Avertissements de composition" })).toContainText("fichier absent");
  await expect(page.locator('[data-layer="title"]')).toHaveCSS("font-family", "system-ui, sans-serif");
  await page.getByRole("button", { name: "Police invalid", exact: true }).click();
  await expect(page.getByRole("list", { name: "Avertissements de composition" })).toContainText("illisible");
  await page.getByRole("button", { name: "Police valid", exact: true }).click();
  await expect(page.locator('[data-layer="title"]')).toHaveCSS("font-family", /FTScene-/);
  await expect(page.getByRole("list", { name: "Avertissements de composition" })).toHaveCount(0);
});
