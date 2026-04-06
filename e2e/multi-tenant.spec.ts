import { test, expect } from "@playwright/test";

test.describe("Multi-tenant Isolation", () => {
  let org1Cookie: string;
  let org2Cookie: string;

  test.beforeAll(async ({ request }) => {
    // Login as org1 admin
    const r1 = await request.post("/api/auth/login", {
      data: { email: "admin@barberia.cl", password: "Admin1234!" },
    });
    expect(r1.ok()).toBeTruthy();
    org1Cookie = r1.headers()["set-cookie"] || "";

    // Login as org2 admin
    const r2 = await request.post("/api/auth/login", {
      data: { email: "admin@rival.cl", password: "Admin1234!" },
    });
    expect(r2.ok()).toBeTruthy();
    org2Cookie = r2.headers()["set-cookie"] || "";
  });

  test("org1 admin sees only org1 barbers", async ({ request }) => {
    const res = await request.get("/api/admin/barbers", {
      headers: { Cookie: org1Cookie },
    });
    const { barbers } = await res.json();
    const names = barbers.map((b: { name: string }) => b.name);
    expect(names).toContain("Daniel Silva");
    expect(names).not.toContain("Pedro Rival");
  });

  test("org2 admin sees only org2 barbers", async ({ request }) => {
    const res = await request.get("/api/admin/barbers", {
      headers: { Cookie: org2Cookie },
    });
    const { barbers } = await res.json();
    const names = barbers.map((b: { name: string }) => b.name);
    expect(names).toContain("Pedro Rival");
    expect(names).not.toContain("Daniel Silva");
  });

  test("org1 admin cannot access org2 appointment by ID", async ({ request }) => {
    const res = await request.get("/api/admin/appointments/apt-rival-test", {
      headers: { Cookie: org1Cookie },
    });
    expect(res.status()).toBe(404);
  });

  test("public booking shows only org-specific services", async ({ request }) => {
    const r1 = await request.get("/api/book/services?slug=mi-barberia");
    const s1 = await r1.json();
    const r2 = await request.get("/api/book/services?slug=rival-barber");
    const s2 = await r2.json();

    const names1 = s1.services.map((s: { name: string }) => s.name);
    const names2 = s2.services.map((s: { name: string }) => s.name);

    expect(names1).toContain("Corte Clásico");
    expect(names1).not.toContain("Corte Rival");
    expect(names2).toContain("Corte Rival");
    expect(names2).not.toContain("Corte Clásico");
  });
});
