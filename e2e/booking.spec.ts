import { test, expect } from "@playwright/test";

test.describe("Public Booking Flow", () => {
  test("landing page loads with org info", async ({ page }) => {
    await page.goto("/mi-barberia");
    await expect(page.locator("text=MarBrava")).toBeVisible();
    await expect(page.locator("text=Reservar hora")).toBeVisible();
    await expect(page.locator("text=Nuestros profesionales")).toBeVisible();
  });

  test("booking page shows service selection", async ({ page }) => {
    await page.goto("/mi-barberia/book");
    await expect(page.locator("text=Elige tus servicios")).toBeVisible();
    await expect(page.locator("text=Corte Clásico")).toBeVisible();
    await expect(page.locator("text=Barba")).toBeVisible();
  });

  test("can select a service and proceed to date selection", async ({ page }) => {
    await page.goto("/mi-barberia/book");

    // Select Corte Clásico
    await page.click("text=Corte Clásico");
    await expect(page.locator('button:has-text("Continuar")')).toBeVisible();

    // Click Continue
    await page.click('button:has-text("Continuar")');

    // Should now show date picker
    await expect(page.locator("text=Elige una fecha")).toBeVisible({ timeout: 5000 });
  });

  test("availability API returns data for valid date", async ({ request }) => {
    // Get services first
    const svcRes = await request.get("/api/book/services?slug=mi-barberia");
    expect(svcRes.ok()).toBeTruthy();
    const { services } = await svcRes.json();
    expect(services.length).toBeGreaterThan(0);

    // Get branches
    const brRes = await request.get("/api/book/branches?slug=mi-barberia");
    expect(brRes.ok()).toBeTruthy();
    const { branches } = await brRes.json();
    expect(branches.length).toBeGreaterThan(0);

    // Get availability for next Monday
    const now = new Date();
    const daysUntilMonday = ((8 - now.getDay()) % 7) || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysUntilMonday);
    const dateStr = monday.toISOString().split("T")[0];

    const availRes = await request.get(
      `/api/book/availability?serviceId=${services[0].id}&date=${dateStr}&branchId=${branches[0].id}&slug=mi-barberia`
    );
    expect(availRes.ok()).toBeTruthy();
    const data = await availRes.json();
    expect(data.barbers).toBeDefined();
  });

  test("heatmap API returns levels for date range", async ({ request }) => {
    const svcRes = await request.get("/api/book/services?slug=mi-barberia");
    const { services } = await svcRes.json();
    const brRes = await request.get("/api/book/branches?slug=mi-barberia");
    const { branches } = await brRes.json();

    const heatRes = await request.get(
      `/api/book/heatmap?branchId=${branches[0].id}&serviceId=${services[0].id}&days=7&slug=mi-barberia`
    );
    expect(heatRes.ok()).toBeTruthy();
    const { heatmap } = await heatRes.json();
    expect(heatmap.length).toBe(7);

    // Each day should have a level
    for (const day of heatmap) {
      expect(["high", "medium", "low", "full", "closed"]).toContain(day.level);
    }
  });

  test("booking without auth is rejected at /api/admin", async ({ request }) => {
    const res = await request.get("/api/admin/appointments");
    expect(res.status()).toBe(401);
  });
});
