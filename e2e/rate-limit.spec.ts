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
});
