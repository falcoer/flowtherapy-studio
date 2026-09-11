import { test, expect } from "@playwright/test";
test("creative exploration, keyboard, persistence and campaign continuity", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".lab-overflow")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/lab-desktop.png",
    fullPage: true,
  });
  await expect(
    page.getByRole("heading", { name: "Trouvez votre vibration." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Festival solaire", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Énergie", exact: true }),
  ).toHaveValue("95");
  const pad = page.getByRole("group", { name: "Terrain énergie et densité" });
  await pad.click({ position: { x: 30, y: 30 } });
  await page.getByRole("button", { name: "↶ Revenir" }).click();
  await expect(
    page.getByRole("slider", { name: "Énergie", exact: true }),
  ).toHaveValue("95");
  await page.getByRole("slider", { name: "Énergie", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("slider", { name: "Énergie", exact: true }),
  ).toHaveValue("94");
  await page.getByLabel("Nom de la recette").fill("Ma direction");
  await page
    .getByRole("button", { name: "+ Garder cette recette", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: "Ma direction", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Énergie", exact: true }),
  ).toHaveValue("94");
  await page.getByRole("button", { name: "Campagne", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Titre de la campagne", exact: true })
    .fill("Le laboratoire en concert");
  await page
    .getByRole("button", { name: "✧ Laboratoire créatif", exact: true })
    .click();
  await expect(page.locator(".lab-poster h2")).toHaveText(
    "Le laboratoire en concert",
  );
  await expect(
    page.getByRole("slider", { name: "Énergie", exact: true }),
  ).toHaveValue("94");
  await page.getByRole("button", { name: "Story", exact: true }).click();
  await expect(page.locator(".lab-poster")).toHaveClass(/story/);
});
test("palette lock, nearby variants, overflow and mobile layout", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Verrouiller", exact: true }).click();
  await page
    .getByRole("button", { name: "✧ Surprends-moi", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Minuit électrique", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Explorer autour ↗", exact: true })
    .click();
  await expect(page.locator(".lab-variants button")).toHaveCount(4);
  await page.getByRole("button", { name: "Campagne", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Titre de la campagne", exact: true })
    .fill("Un très long titre ".repeat(40));
  await page
    .getByRole("button", { name: "✧ Laboratoire créatif", exact: true })
    .click();
  await expect(
    page.getByText("Le contenu dépasse ce format.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".lab-poster h2")).toHaveText(
    "Un très long titre ".repeat(40).trim(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Trouvez votre vibration." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
