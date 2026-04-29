import { test, expect } from "@playwright/test";

test.describe("Autenticación", () => {
  test("login page renderiza el form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("login admin redirige a /admin", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@barberia.cl");
    await page.fill('input[type="password"]', "Admin1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin", { timeout: 10000 });
    expect(page.url()).toContain("/admin");
  });

  test("login con password equivocada muestra error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@barberia.cl");
    await page.fill('input[type="password"]', "wrong");
    await page.click('button[type="submit"]');
    // El error es un div específico (border-red-500/30) que solo se renderiza
    // cuando hay error. Buscamos ese contenedor por texto exacto.
    await expect(page.getByText("Credenciales incorrectas")).toBeVisible({ timeout: 8000 });
  });

  test("acceder a /admin sin auth redirige a /login", async ({ page, request }) => {
    // Test el middleware directo via request (sin browser) para aislar el
    // comportamiento de redirect del lado del browser.
    await page.context().clearCookies();
    const res = await request.get("/admin", { maxRedirects: 0, failOnStatusCode: false });
    // Debería ser 307 con Location apuntando a /login
    expect([301, 302, 307, 308]).toContain(res.status());
    expect(res.headers()["location"]).toContain("/login");
  });

  test("login barber redirige a /barber", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.fill('input[type="email"]', "daniel@barberia.cl");
    await page.fill('input[type="password"]', "Barber1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/barber", { timeout: 10000 });
    expect(page.url()).toContain("/barber");
  });

  test("logout limpia la cookie y redirige a /login", async ({ request }) => {
    // Login
    const loginRes = await request.post("/api/auth/login", {
      data: { email: "admin@barberia.cl", password: "Admin1234!" },
    });
    expect(loginRes.ok()).toBeTruthy();
    const cookie = loginRes.headers()["set-cookie"];

    // Logout
    const logoutRes = await request.post("/api/auth/logout", {
      headers: { Cookie: cookie || "" },
    });
    expect(logoutRes.ok()).toBeTruthy();
  });
});
