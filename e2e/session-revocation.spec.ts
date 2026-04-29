import { test, expect } from "@playwright/test";

/**
 * Tests de invalidación de sesión server-side.
 *
 * Antes los JWTs vivían 7 días sin forma de revocar — un cookie robada
 * era válida hasta expirar. Ahora cada login crea una Session row en DB
 * y verifySessionToken la chequea en cada request. Si la session se
 * marca revoked, el JWT deja de funcionar inmediatamente.
 */

const ADMIN_EMAIL = "admin@barberia.cl";
const ADMIN_PASS = "Admin1234!";

async function loginGetCookie(request: import("@playwright/test").APIRequestContext) {
  const res = await request.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  expect(res.ok()).toBeTruthy();
  return res.headers()["set-cookie"] || "";
}

test.describe("Session revocation server-side", () => {
  test("Logout invalida la cookie INMEDIATAMENTE (aunque no haya expirado)", async ({ request }) => {
    const cookie = await loginGetCookie(request);

    // Verificar que la cookie funciona
    const before = await request.get("/api/admin/me", { headers: { Cookie: cookie } });
    expect(before.status()).toBe(200);

    // Logout
    const logout = await request.post("/api/auth/logout", { headers: { Cookie: cookie } });
    expect(logout.ok()).toBeTruthy();

    // La MISMA cookie ya no debería funcionar (revocada server-side).
    // Esto es lo que NO funcionaba antes — el JWT seguía válido.
    const after = await request.get("/api/admin/me", { headers: { Cookie: cookie } });
    expect(after.status()).toBe(401);
  });

  test("Logout-all cierra TODAS las sesiones del usuario", async ({ request }) => {
    // Login con sesión A
    const cookieA = await loginGetCookie(request);
    // Login con sesión B (otro device hipotético)
    const cookieB = await loginGetCookie(request);

    // Ambas funcionan
    expect((await request.get("/api/admin/me", { headers: { Cookie: cookieA } })).status()).toBe(200);
    expect((await request.get("/api/admin/me", { headers: { Cookie: cookieB } })).status()).toBe(200);

    // Logout-all desde A
    const allOut = await request.post("/api/auth/logout-all", { headers: { Cookie: cookieA } });
    expect(allOut.ok()).toBeTruthy();
    const data = await allOut.json();
    expect(data.revokedCount).toBeGreaterThanOrEqual(2);

    // Ambas cookies son rechazadas ahora
    expect((await request.get("/api/admin/me", { headers: { Cookie: cookieA } })).status()).toBe(401);
    expect((await request.get("/api/admin/me", { headers: { Cookie: cookieB } })).status()).toBe(401);
  });

  test("Logout es idempotente (segunda vez no falla)", async ({ request }) => {
    const cookie = await loginGetCookie(request);
    const r1 = await request.post("/api/auth/logout", { headers: { Cookie: cookie } });
    expect(r1.ok()).toBeTruthy();
    const r2 = await request.post("/api/auth/logout", { headers: { Cookie: cookie } });
    expect(r2.ok()).toBeTruthy();
  });

  test("Logout sin cookie no rompe", async ({ request }) => {
    const res = await request.post("/api/auth/logout");
    expect(res.ok()).toBeTruthy();
  });
});

test.describe("Audit log", () => {
  test("Login se registra en audit log", async ({ request }) => {
    const cookie = await loginGetCookie(request);
    const audit = await request.get("/api/admin/audit?action=auth.login&limit=5", {
      headers: { Cookie: cookie },
    });
    expect(audit.ok()).toBeTruthy();
    const data = await audit.json();
    expect(data.items).toBeDefined();
    expect(Array.isArray(data.items)).toBe(true);
    // Debería haber al menos 1 entry de auth.login (el de este test)
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items[0].action).toBe("auth.login");
    expect(data.items[0].userEmail).toBe(ADMIN_EMAIL);
  });

  test("logout-all se registra en audit log", async ({ request }) => {
    const cookie = await loginGetCookie(request);
    await request.post("/api/auth/logout-all", { headers: { Cookie: cookie } });

    // Re-login (la previa quedó revocada)
    const cookie2 = await loginGetCookie(request);
    const audit = await request.get("/api/admin/audit?action=auth.logout_all&limit=1", {
      headers: { Cookie: cookie2 },
    });
    expect(audit.ok()).toBeTruthy();
    const data = await audit.json();
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items[0].action).toBe("auth.logout_all");
    expect(data.items[0].metadata.revokedCount).toBeGreaterThan(0);
  });

  test("Audit log soporta paginación con cursor", async ({ request }) => {
    const cookie = await loginGetCookie(request);
    const page1 = await request.get("/api/admin/audit?limit=2", { headers: { Cookie: cookie } });
    const data1 = await page1.json();
    expect(data1.items.length).toBeLessThanOrEqual(2);

    if (data1.nextCursor) {
      const page2 = await request.get(`/api/admin/audit?limit=2&cursor=${data1.nextCursor}`, {
        headers: { Cookie: cookie },
      });
      const data2 = await page2.json();
      expect(data2.items.length).toBeLessThanOrEqual(2);
      // No deberían haber items duplicados entre páginas
      const ids1 = data1.items.map((i: { id: string }) => i.id);
      const ids2 = data2.items.map((i: { id: string }) => i.id);
      expect(ids2.every((id: string) => !ids1.includes(id))).toBe(true);
    }
  });

  test("Audit log requiere auth", async ({ request }) => {
    const res = await request.get("/api/admin/audit");
    expect(res.status()).toBe(401);
  });
});

test.describe("Security headers", () => {
  test("HSTS header presente", async ({ request }) => {
    const res = await request.get("/login");
    const hsts = res.headers()["strict-transport-security"];
    expect(hsts).toBeDefined();
    expect(hsts).toContain("max-age");
  });

  test("X-Frame-Options DENY (anti-clickjacking)", async ({ request }) => {
    const res = await request.get("/login");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
  });

  test("X-Content-Type-Options nosniff", async ({ request }) => {
    const res = await request.get("/login");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("Content-Security-Policy presente", async ({ request }) => {
    const res = await request.get("/login");
    const csp = res.headers()["content-security-policy"];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test("Referrer-Policy strict-origin-when-cross-origin", async ({ request }) => {
    const res = await request.get("/login");
    expect(res.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("Permissions-Policy bloquea cámara/mic/geo", async ({ request }) => {
    const res = await request.get("/login");
    const policy = res.headers()["permissions-policy"];
    expect(policy).toBeDefined();
    expect(policy).toContain("camera=()");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("geolocation=()");
  });
});
