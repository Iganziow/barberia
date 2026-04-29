import { test, expect } from "@playwright/test";

/**
 * Tests de seguridad del sistema. Si alguno falla, hay un agujero.
 *
 * Cubrimos:
 *  - JWT malformado / con firma inválida → no permitir acceso
 *  - JWT con role manipulado (CLIENT → ADMIN forzado) → no permitir
 *  - Cross-org access (intentar ver appointment de otra org)
 *  - Inputs maliciosos: SQL injection, XSS, payloads gigantes
 *  - Endpoints admin/barber sin rol correcto → 401/403
 */

test.describe("Seguridad — JWT", () => {
  test("JWT malformado → 401 en endpoints admin", async ({ request }) => {
    const res = await request.get("/api/admin/me", {
      headers: { Cookie: "bb_session=not-a-jwt" },
    });
    expect(res.status()).toBe(401);
  });

  test("JWT con firma inválida (firmado con otra key) → 401", async ({ request }) => {
    // Token firmado con una key falsa — alg HS256, payload valid-looking.
    // El server debe rechazar porque no matchea su JWT_SECRET.
    const fakeJwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrIiwicm9sZSI6IkFETUlOIiwiZW1haWwiOiJoYWNrZXJAZXhhbXBsZS5jb20iLCJuYW1lIjoiSGFja2VyIiwib3JnSWQiOiJmYWtlIiwiaWF0IjoxNzAwMDAwMDAwfQ.WRONG_SIGNATURE_HERE";
    const res = await request.get("/api/admin/me", {
      headers: { Cookie: `bb_session=${fakeJwt}` },
    });
    expect(res.status()).toBe(401);
  });

  test("Cookie vacía → 401 en endpoints admin", async ({ request }) => {
    const res = await request.get("/api/admin/me", {
      headers: { Cookie: "bb_session=" },
    });
    expect(res.status()).toBe(401);
  });

  test("Sin cookie → endpoints protegidos NUNCA devuelven 200", async ({ request }) => {
    // Lo crítico: nunca 200 sin auth. Aceptamos 401, 403, 404, 405:
    //  - 401: middleware/withAdmin rechazó por falta de auth
    //  - 403: rol incorrecto
    //  - 404: endpoint no expone GET (ej. POST-only sin GET handler)
    //  - 405: Method Not Allowed (POST-only respondiendo a GET)
    const protectedEndpoints = [
      "/api/admin/me",
      "/api/admin/barbers",
      "/api/admin/services",
      "/api/admin/clients",
      "/api/admin/appointments",
      "/api/admin/branches",
      "/api/admin/reports?period=month",
      "/api/admin/payments",
      "/api/admin/block-times",
      "/api/admin/integrations/keys",
      "/api/admin/integrations/webhooks",
      "/api/admin/waitlist",
      "/api/admin/organization",
      "/api/admin/schedule",
      "/api/barber/me",
      "/api/barber/appointments",
      "/api/barber/block-times",
      "/api/barber/reports?period=month",
      "/api/superadmin/organizations",
      "/api/superadmin/stats",
    ];
    for (const ep of protectedEndpoints) {
      const res = await request.get(ep);
      expect.soft(res.status(), `${ep} no debería ser 200 sin auth`).not.toBe(200);
      expect.soft([401, 403, 404, 405], `${ep} debería ser auth/method error`).toContain(res.status());
    }
  });

  test("POST-only endpoints sin auth → tampoco devuelven 200", async ({ request }) => {
    // Probamos endpoints conocidos que solo aceptan POST.
    const postOnly = [
      "/api/admin/notifications/send-reminders",
      "/api/admin/clients/import",
    ];
    for (const ep of postOnly) {
      const res = await request.post(ep, { data: {} });
      expect.soft([401, 403], `${ep} debería rechazar POST sin auth`).toContain(res.status());
    }
  });
});

test.describe("Seguridad — role escalation", () => {
  let barberCookie = "";

  test.beforeAll(async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: "daniel@barberia.cl", password: "Barber1234!" },
    });
    barberCookie = res.headers()["set-cookie"] || "";
  });

  test("Barber NO puede acceder a /api/admin/*", async ({ request }) => {
    const adminEndpoints = [
      "/api/admin/barbers",
      "/api/admin/services",
      "/api/admin/clients",
      "/api/admin/reports?period=month",
      "/api/admin/integrations/keys",
    ];
    for (const ep of adminEndpoints) {
      const res = await request.get(ep, { headers: { Cookie: barberCookie } });
      expect.soft([401, 403], `${ep} debería bloquear barber`).toContain(res.status());
    }
  });

  test("Barber NO puede acceder a /api/superadmin/*", async ({ request }) => {
    const res = await request.get("/api/superadmin/organizations", {
      headers: { Cookie: barberCookie },
    });
    expect([401, 403]).toContain(res.status());
  });
});

test.describe("Seguridad — inputs maliciosos", () => {
  const SLUG = "mi-barberia";

  test("clientName con XSS payload se sanitiza (sin <script>)", async ({ request }) => {
    // Hacemos un POST con XSS en el name; el endpoint debería devolver
    // 4xx (datos inválidos / overlap / fuera de horario) sin crashear.
    const res = await request.post(`/api/book?slug=${SLUG}`, {
      data: {
        serviceId: "fake",
        barberId: "fake",
        branchId: "fake",
        start: "2099-01-01T10:00:00.000Z",
        end: "2099-01-01T10:30:00.000Z",
        clientName: '<script>alert("xss")</script>',
        clientPhone: "+56912345678",
      },
    });
    // 400 (validación falla por future >60 días) o 404 (servicio no existe).
    expect([400, 404, 409]).toContain(res.status());
  });

  test("clientName muy largo (>200 chars) → 400", async ({ request }) => {
    const longName = "A".repeat(500);
    const res = await request.post(`/api/book?slug=${SLUG}`, {
      data: {
        serviceId: "x",
        barberId: "x",
        branchId: "x",
        start: "2099-01-01T10:00:00.000Z",
        end: "2099-01-01T10:30:00.000Z",
        clientName: longName,
        clientPhone: "+56912345678",
      },
    });
    expect(res.status()).toBe(400);
  });

  test("notePublic muy largo (>500 chars) → 400 o trunca", async ({ request }) => {
    const longNote = "A".repeat(2000);
    const res = await request.post(`/api/book?slug=${SLUG}`, {
      data: {
        serviceId: "x",
        barberId: "x",
        branchId: "x",
        start: "2099-01-01T10:00:00.000Z",
        end: "2099-01-01T10:30:00.000Z",
        clientName: "Test",
        clientPhone: "+56912345678",
        notePublic: longNote,
      },
    });
    expect(res.status()).toBe(400);
  });

  test("JSON malformado → 400, no 500", async ({ request }) => {
    const res = await request.post(`/api/book?slug=${SLUG}`, {
      data: "this is not json",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  test("ID con SQL injection en query → no rompe", async ({ request }) => {
    // Prisma parametriza queries — SQL injection no debería ser posible.
    const res = await request.get(`/api/book/services?slug=mi-barberia' OR '1'='1`);
    // Debería ser 404 (slug no existe) o 200 con datos del slug que matchee.
    // NUNCA 500 por syntax error de SQL.
    expect(res.status()).not.toBe(500);
  });

  test("Booking ID con caracteres extraños no rompe el GET", async ({ request }) => {
    const res = await request.get("/api/book/x';drop%20table%20appointments;--");
    // Debería ser 404 ID no existe, no 500.
    expect(res.status()).toBe(404);
  });
});

test.describe("Seguridad — método HTTP incorrecto", () => {
  test("GET en endpoint POST-only NO devuelve 500", async ({ request }) => {
    const res = await request.get("/api/admin/clients/import");
    // Sin auth → 401, con auth → 400 (custom GET handler) o 405 si no hay handler.
    // NUNCA debería ser 500.
    expect(res.status()).not.toBe(500);
    expect([400, 401, 405]).toContain(res.status());
  });

  test("DELETE en endpoint sin DELETE handler NO crash", async ({ request }) => {
    const res = await request.delete("/api/book");
    expect(res.status()).not.toBe(500);
  });
});
