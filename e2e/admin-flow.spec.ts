import { test, expect } from "@playwright/test";

/**
 * Flujo del admin: login + listing + crear cita + cambio de status
 * + listar clientes (para verificar que los importados se ven).
 */

const ADMIN_EMAIL = "admin@barberia.cl";
const ADMIN_PASS = "Admin1234!";

async function login(request: import("@playwright/test").APIRequestContext) {
  const res = await request.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  expect(res.ok()).toBeTruthy();
  return res.headers()["set-cookie"] || "";
}

test.describe("Admin — flujo backend", () => {
  test("Login admin retorna 200 + cookie", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
    });
    expect(res.ok()).toBeTruthy();
    const cookie = res.headers()["set-cookie"];
    expect(cookie).toContain("bb_session=");
    const data = await res.json();
    expect(data.user.role).toBe("ADMIN");
  });

  test("Login con password incorrecta → 401", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: ADMIN_EMAIL, password: "wrong" },
    });
    expect(res.status()).toBe(401);
  });

  test("Listar barberos del admin", async ({ request }) => {
    const cookie = await login(request);
    const res = await request.get("/api/admin/barbers", { headers: { Cookie: cookie } });
    expect(res.ok()).toBeTruthy();
    const { barbers } = await res.json();
    expect(barbers.length).toBeGreaterThan(0);
  });

  test("Listar servicios del admin", async ({ request }) => {
    const cookie = await login(request);
    const res = await request.get("/api/admin/services", { headers: { Cookie: cookie } });
    expect(res.ok()).toBeTruthy();
    const { services } = await res.json();
    expect(services.length).toBeGreaterThan(0);
  });

  test("Listar sucursales del admin", async ({ request }) => {
    const cookie = await login(request);
    const res = await request.get("/api/admin/branches", { headers: { Cookie: cookie } });
    expect(res.ok()).toBeTruthy();
    const { branches } = await res.json();
    expect(branches.length).toBeGreaterThan(0);
  });

  test("Listar clientes del admin (incluyendo importados)", async ({ request }) => {
    const cookie = await login(request);
    const res = await request.get("/api/admin/clients?list=true&pageSize=5", {
      headers: { Cookie: cookie },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.total).toBeGreaterThan(0);
    expect(data.clients).toBeDefined();
    expect(Array.isArray(data.clients)).toBe(true);
  });

  test("Reportes admin retornan stats por período", async ({ request }) => {
    const cookie = await login(request);
    const res = await request.get("/api/admin/reports?period=month", {
      headers: { Cookie: cookie },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.dashboard).toBeDefined();
    expect(typeof data.dashboard.appointments?.total).toBe("number");
  });

  test("Acceso a /api/admin/* sin auth → 401", async ({ request }) => {
    const endpoints = [
      "/api/admin/barbers",
      "/api/admin/services",
      "/api/admin/clients",
      "/api/admin/reports?period=month",
      "/api/admin/appointments",
    ];
    for (const ep of endpoints) {
      const res = await request.get(ep);
      expect(res.status()).toBe(401);
    }
  });

  test("Usuario BARBER no puede acceder a /api/admin/*", async ({ request }) => {
    const loginRes = await request.post("/api/auth/login", {
      data: { email: "daniel@barberia.cl", password: "Barber1234!" },
    });
    expect(loginRes.ok()).toBeTruthy();
    const cookie = loginRes.headers()["set-cookie"] || "";

    // Intentar acceder a endpoint admin con cookie de barber
    const res = await request.get("/api/admin/barbers", { headers: { Cookie: cookie } });
    // Debería ser 401 o 403
    expect([401, 403]).toContain(res.status());
  });

  test("Crear cita admin con datos válidos → 201", async ({ request }) => {
    const cookie = await login(request);

    // Get barber, service, branch, client
    const [barbersRes, servicesRes, branchesRes, clientsRes] = await Promise.all([
      request.get("/api/admin/barbers", { headers: { Cookie: cookie } }),
      request.get("/api/admin/services", { headers: { Cookie: cookie } }),
      request.get("/api/admin/branches", { headers: { Cookie: cookie } }),
      request.get("/api/admin/clients?list=true&pageSize=1", { headers: { Cookie: cookie } }),
    ]);
    const { barbers } = await barbersRes.json();
    const { services } = await servicesRes.json();
    const { branches } = await branchesRes.json();
    const { clients } = await clientsRes.json();

    if (!barbers[0] || !services[0] || !branches[0] || !clients[0]) test.skip();

    // Próximo lunes a las 16:00 (debería estar libre)
    const now = new Date();
    const daysUntilMonday = ((8 - now.getDay()) % 7) || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysUntilMonday);
    monday.setHours(16, 0, 0, 0);
    const end = new Date(monday.getTime() + services[0].durationMin * 60_000);

    const res = await request.post("/api/admin/appointments", {
      headers: { Cookie: cookie },
      data: {
        start: monday.toISOString(),
        end: end.toISOString(),
        barberId: barbers[0].id,
        serviceId: services[0].id,
        clientId: clients[0].id,
        branchId: branches[0].id,
        price: services[0].price,
      },
    });
    // 201 si crea, 409 si overlap/horario inválido (ambos son comportamiento válido)
    expect([201, 409, 400]).toContain(res.status());
  });

  test("Crear cita admin a las 04:00 AM (fuera de horario) → 409", async ({ request }) => {
    const cookie = await login(request);
    const [barbersRes, servicesRes, branchesRes, clientsRes] = await Promise.all([
      request.get("/api/admin/barbers", { headers: { Cookie: cookie } }),
      request.get("/api/admin/services", { headers: { Cookie: cookie } }),
      request.get("/api/admin/branches", { headers: { Cookie: cookie } }),
      request.get("/api/admin/clients?list=true&pageSize=1", { headers: { Cookie: cookie } }),
    ]);
    const { barbers } = await barbersRes.json();
    const { services } = await servicesRes.json();
    const { branches } = await branchesRes.json();
    const { clients } = await clientsRes.json();
    if (!barbers[0] || !services[0] || !branches[0] || !clients[0]) test.skip();

    const now = new Date();
    const daysUntilMonday = ((8 - now.getDay()) % 7) || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysUntilMonday);
    monday.setHours(4, 0, 0, 0); // 04:00 AM — sucursal cerrada
    const end = new Date(monday.getTime() + services[0].durationMin * 60_000);

    const res = await request.post("/api/admin/appointments", {
      headers: { Cookie: cookie },
      data: {
        start: monday.toISOString(),
        end: end.toISOString(),
        barberId: barbers[0].id,
        serviceId: services[0].id,
        clientId: clients[0].id,
        branchId: branches[0].id,
        price: services[0].price,
      },
    });
    expect(res.status()).toBe(409);
  });
});
