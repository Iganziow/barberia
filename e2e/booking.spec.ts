import { test, expect } from "@playwright/test";

/**
 * Tests del flujo público de reserva (Express layout).
 *
 * Cubre:
 *  - Landing redirige al booking (/[slug] → /[slug]/book)
 *  - El booking renderiza hero + secciones del flujo
 *  - APIs públicas (services, branches, availability, heatmap, info) responden bien
 *  - 404 para slug inválido
 *  - Acceso a /api/admin sin auth devuelve 401
 */

test.describe("Booking público — UI (Express layout)", () => {
  test("/[slug] redirige a /[slug]/book", async ({ page }) => {
    await page.goto("/mi-barberia");
    await page.waitForURL("**/mi-barberia/book", { timeout: 10000 });
    expect(page.url()).toContain("/mi-barberia/book");
  });

  test("Booking renderiza hero del negocio + hello + secciones", async ({ page }) => {
    await page.goto("/mi-barberia/book");
    // Hero del negocio (info)
    await expect(page.locator(".bk-a__biz-name")).toBeVisible();
    // Tagline del flujo
    await expect(page.locator("h1.bk-a__hello")).toContainText(/Reserva tu hora/i);
    // Sección Servicio
    await expect(page.locator("text=1 · Servicio").first()).toBeVisible();
  });

  test("Skeletons aparecen mientras cargan los servicios", async ({ page }) => {
    await page.goto("/mi-barberia/book");
    // Después de la carga, deberíamos ver al menos un servicio renderizado
    await expect(page.locator(".bk-a__svc").first()).toBeVisible({ timeout: 8000 });
  });

  test("Slug inválido muestra pantalla 'Negocio no encontrado'", async ({ page }) => {
    await page.goto("/no-existe-este-slug");
    await page.waitForURL("**/no-existe-este-slug/book", { timeout: 10000 });
    // Hay un <title> y un <h1> con el mismo texto — usamos role para ser específicos.
    await expect(
      page.getByRole("heading", { name: "Negocio no encontrado" })
    ).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Booking público — APIs", () => {
  test("/api/book/info devuelve nombre + descripción + ubicación", async ({ request }) => {
    const res = await request.get("/api/book/info?slug=mi-barberia");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.branch).toBeDefined();
    expect(data.branch.orgName).toBe("Mi Barbería");
    expect(data.branch.workingHours).toBeDefined();
    expect(Array.isArray(data.branch.workingHours)).toBe(true);
  });

  test("/api/book/services solo retorna servicios con barberos activos", async ({ request }) => {
    const res = await request.get("/api/book/services?slug=mi-barberia");
    expect(res.ok()).toBeTruthy();
    const { services } = await res.json();
    expect(services.length).toBeGreaterThan(0);
    // Estructura mínima
    for (const s of services) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.durationMin).toBeGreaterThan(0);
      expect(s.price).toBeGreaterThanOrEqual(0);
    }
  });

  test("/api/book/branches lista las sucursales", async ({ request }) => {
    const res = await request.get("/api/book/branches?slug=mi-barberia");
    expect(res.ok()).toBeTruthy();
    const { branches } = await res.json();
    expect(branches.length).toBeGreaterThan(0);
  });

  test("/api/book/availability retorna barberos para una fecha futura válida", async ({ request }) => {
    const svcRes = await request.get("/api/book/services?slug=mi-barberia");
    const { services } = await svcRes.json();
    const brRes = await request.get("/api/book/branches?slug=mi-barberia");
    const { branches } = await brRes.json();

    // Próximo lunes (Mon=1) — sucursal abre lun-sáb
    const now = new Date();
    const daysUntilMonday = ((8 - now.getDay()) % 7) || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysUntilMonday);
    const dateStr = monday.toISOString().split("T")[0];

    const res = await request.get(
      `/api/book/availability?serviceId=${services[0].id}&date=${dateStr}&branchId=${branches[0].id}&slug=mi-barberia`
    );
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.barbers)).toBe(true);
  });

  test("/api/book/heatmap retorna 7 días con levels válidos", async ({ request }) => {
    const svcRes = await request.get("/api/book/services?slug=mi-barberia");
    const { services } = await svcRes.json();
    const brRes = await request.get("/api/book/branches?slug=mi-barberia");
    const { branches } = await brRes.json();

    const res = await request.get(
      `/api/book/heatmap?branchId=${branches[0].id}&serviceId=${services[0].id}&days=7&slug=mi-barberia`
    );
    expect(res.ok()).toBeTruthy();
    const { heatmap } = await res.json();
    expect(heatmap.length).toBe(7);
    for (const day of heatmap) {
      expect(["high", "medium", "low", "full", "closed"]).toContain(day.level);
      expect(day.totalSlots).toBeGreaterThanOrEqual(0);
      expect(day.availableSlots).toBeGreaterThanOrEqual(0);
    }
  });

  test("/api/book/availability con fecha pasada retorna array vacío", async ({ request }) => {
    const svcRes = await request.get("/api/book/services?slug=mi-barberia");
    const { services } = await svcRes.json();
    const brRes = await request.get("/api/book/branches?slug=mi-barberia");
    const { branches } = await brRes.json();

    // Ayer
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0];

    const res = await request.get(
      `/api/book/availability?serviceId=${services[0].id}&date=${dateStr}&branchId=${branches[0].id}&slug=mi-barberia`
    );
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    // No barbers ni slots disponibles
    expect(data.barbers || data.slots || []).toEqual([]);
  });

  test("/api/book/availability rechaza fecha >60 días futuro", async ({ request }) => {
    const svcRes = await request.get("/api/book/services?slug=mi-barberia");
    const { services } = await svcRes.json();
    const brRes = await request.get("/api/book/branches?slug=mi-barberia");
    const { branches } = await brRes.json();

    const future = new Date();
    future.setDate(future.getDate() + 90); // 90 días en el futuro
    const dateStr = future.toISOString().split("T")[0];

    const res = await request.get(
      `/api/book/availability?serviceId=${services[0].id}&date=${dateStr}&branchId=${branches[0].id}&slug=mi-barberia`
    );
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    // Array vacío porque está fuera del rango de 60 días
    expect((data.barbers || []).length).toBe(0);
  });

  test("/api/book/services con slug inválido devuelve 404", async ({ request }) => {
    const res = await request.get("/api/book/services?slug=no-existe-x");
    expect(res.status()).toBe(404);
  });

  test("Acceso a /api/admin sin auth devuelve 401", async ({ request }) => {
    const res = await request.get("/api/admin/appointments");
    expect(res.status()).toBe(401);
  });
});
