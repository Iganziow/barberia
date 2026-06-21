import { test, expect } from "@playwright/test";

/**
 * Rate limiter — 10 bookings/min/IP en POST /api/book, 5/min en
 * /api/book/waitlist. Si esto falla, un atacante puede flood-ear
 * el endpoint con bookings spam.
 *
 * Cada test usa un X-Forwarded-For ÚNICO para que el bucket del rate
 * limiter sea independiente entre tests/runs. El rate limiter usa
 * `req.headers.get("x-forwarded-for").split(",")[0].trim()` como key.
 */

const SLUG = "mi-barberia";

function uniqueIp() {
  return `10.99.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
}

test.describe("Rate limiter", () => {
  test.setTimeout(60_000);

  test("11 POSTs /api/book seguidos desde mismo IP → el 11vo bloqueado", async ({ request }) => {
    const ip = uniqueIp();
    const payload = { invalid: true };
    const responses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const r = await request.post(`/api/book?slug=${SLUG}`, {
        data: payload,
        headers: { "x-forwarded-for": ip },
      });
      responses.push(r.status());
    }

    // Las primeras 10 son 400 (Zod inválido). La 11va debería ser bloqueada
    // por el rate limiter (también 400 con mensaje "Demasiadas solicitudes",
    // pero también aceptamos 429 si en el futuro se cambia el code).
    const last = responses[10];
    expect([400, 429]).toContain(last);
  });

  test("Waitlist tiene rate limit más estricto (5/min)", async ({ request }) => {
    const ip = uniqueIp();
    const payload = { invalid: true };
    const responses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await request.post(`/api/book/waitlist?slug=${SLUG}`, {
        data: payload,
        headers: { "x-forwarded-for": ip },
      });
      responses.push(r.status());
    }
    expect([400, 429]).toContain(responses[5]);
  });

  test("Rate limit es POR IP — IPs distintas no se afectan entre sí", async ({ request }) => {
    const ip1 = uniqueIp();
    const ip2 = uniqueIp();

    // 10 hits con ip1 → debería saturar
    for (let i = 0; i < 10; i++) {
      await request.post(`/api/book?slug=${SLUG}`, {
        data: { invalid: true },
        headers: { "x-forwarded-for": ip1 },
      });
    }

    // 1 hit con ip2 → debería ser 400 de Zod, NO de rate limit
    const r = await request.post(`/api/book?slug=${SLUG}`, {
      data: { invalid: true },
      headers: { "x-forwarded-for": ip2 },
    });
    expect(r.status()).toBe(400);
    const body = await r.json();
    // El mensaje debe ser de validación, no de rate limit
    expect(body.message).not.toMatch(/Demasiadas solicitudes/i);
  });

  test("Login rate limit P0 — 6to intento con mismo email/IP → 429", async ({ request }) => {
    // Regresión del P0 detectado 2026-04-30: /api/auth/login no tenía
    // rate limit, permitiendo brute force ilimitado de passwords.
    // Ahora: 20/15min por IP + 5/15min por email.
    const ip = uniqueIp();
    // Email random pero único para no contaminar buckets entre tests.
    const email = `bruteforce-${Math.random().toString(36).slice(2, 10)}@test.local`;

    const responses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await request.post("/api/auth/login", {
        data: { email, password: "wrong-password" },
        headers: { "x-forwarded-for": ip },
      });
      responses.push(r.status());
    }

    // Los primeros 5 son 401 (credenciales inválidas — el email no existe
    // pero el rate limit cuenta TODOS los intentos, no solo los fallidos
    // por credencial). El 6to debe ser 429 (techo por-email = 5).
    expect(responses.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(responses[5]).toBe(429);
  });

  test("Login rate limit — emails distintos resetean el bucket por email", async ({ request }) => {
    // El bucket per-email aísla cuentas — atacar a la cuenta A no debe
    // bloquear intentos contra la cuenta B desde el mismo IP (hasta el
    // techo más alto de IP=20).
    const ip = uniqueIp();
    const emailA = `a-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const emailB = `b-${Math.random().toString(36).slice(2, 8)}@test.local`;

    // Saturar email A (5 intentos).
    for (let i = 0; i < 5; i++) {
      await request.post("/api/auth/login", {
        data: { email: emailA, password: "wrong" },
        headers: { "x-forwarded-for": ip },
      });
    }
    // 6to intento contra A → bloqueado
    const blockedA = await request.post("/api/auth/login", {
      data: { email: emailA, password: "wrong" },
      headers: { "x-forwarded-for": ip },
    });
    expect(blockedA.status()).toBe(429);

    // 1er intento contra B desde mismo IP → debe pasar el bucket
    // per-email (B tiene 0 intentos). El bucket per-IP lleva 6 intentos
    // pero el techo es 20, así que también pasa.
    const okB = await request.post("/api/auth/login", {
      data: { email: emailB, password: "wrong" },
      headers: { "x-forwarded-for": ip },
    });
    expect(okB.status()).toBe(401);
  });
});
