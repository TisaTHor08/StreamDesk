import { expect, test } from "@playwright/test";

test("pressing the counter button updates the bound counter widget on the Deck", async ({ page }) => {
  await page.goto("/");

  // Wait for the WebSocket registration round-trip to complete and the
  // seeded "Accueil" page to render.
  await expect(page.getByText("Accueil")).toBeVisible({ timeout: 15000 });

  const counterWidget = page.locator('[data-label="Compteur"]');
  await expect(counterWidget).toBeVisible();
  const before = await counterWidget.getAttribute("data-value");

  await page.getByRole("button", { name: /Compteur \+1/ }).click();

  await expect(async () => {
    const after = await counterWidget.getAttribute("data-value");
    expect(after).not.toBe(before);
  }).toPass({ timeout: 10000 });
});

test("admin: pages list shows the seeded Accueil page", async ({ page }) => {
  await page.goto("/admin/pages");
  await expect(page.getByText("Accueil")).toBeVisible({ timeout: 15000 });
});
