import { test, expect } from "@playwright/test";

test.describe("Smoke — telas públicas (mobile + desktop)", () => {
  test("login: título e campos visíveis", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("cadastro: título visível", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible({ timeout: 30_000 });
  });
});
