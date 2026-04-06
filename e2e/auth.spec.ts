import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h2")).toContainText("Iniciar sesión");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("login with valid admin credentials redirects to /admin", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@barberia.cl");
    await page.fill('input[type="password"]', "Admin1234!");
    await page.click('button:has-text("Entrar")');
    await page.waitForURL("**/admin", { timeout: 10000 });
    await expect(page.url()).toContain("/admin");
  });

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@barberia.cl");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button:has-text("Entrar")');
    await expect(page.locator("text=Credenciales incorrectas")).toBeVisible({ timeout: 5000 });
  });

  test("accessing /admin without auth redirects to login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL("**/login**", { timeout: 10000 });
    await expect(page.url()).toContain("/login");
  });

  test("login as barber redirects to /barber", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "daniel@barberia.cl");
    await page.fill('input[type="password"]', "Barber1234!");
    await page.click('button:has-text("Entrar")');
    await page.waitForURL("**/barber", { timeout: 10000 });
    await expect(page.url()).toContain("/barber");
  });
});
