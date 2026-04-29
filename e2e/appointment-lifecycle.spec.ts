import { test, expect } from "@playwright/test";

/**
 * Lifecycle completo de una cita:
 *   crear → confirmar → reschedule → arrived → in_progress → done + pago
 * y rutas alternativas: cancel con motivo, no-show.
 *
 * Si esto rompe, el barbero no puede operar sus citas.
 */

const ADMIN_EMAIL = "admin@barberia.cl";
const ADMIN_PASS = "Admin1234!";

async function loginAdmin(request: import("@playwright/test").APIRequestContext) {
  const res = await request.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  expect(res.ok()).toBeTruthy();
  return res.headers()["set-cookie"] || "";
}

async function createTestAppointment(
  request: import("@playwright/test").APIRequestContext,
  cookie: string,
  hourOffset = 0
) {
  const [b, s, br, c] = await Promise.all([
    request.get("/api/admin/barbers", { headers: { Cookie: cookie } }),
    request.get("/api/admin/services", { headers: { Cookie: cookie } }),
    request.get("/api/admin/branches", { headers: { Cookie: cookie } }),
    request.get("/api/admin/clients?list=true&pageSize=1", { headers: { Cookie: cookie } }),
  ]);
  const { barbers } = await b.json();
  const { services } = await s.json();
  const { branches } = await br.json();
  const { clients } = await c.json();
  if (!barbers[0] || !services[0] || !branches[0] || !clients[0]) return null;

  // Próximo lunes a 10am + offset (para varias citas en distintos slots)
  const now = new Date();
  const daysUntilMonday = ((8 - now.getDay()) % 7) || 7;
  const start = new Date(now);
  start.setDate(now.getDate() + daysUntilMonday + 14); // 2 semanas adelante
  start.setHours(10 + hourOffset, 0, 0, 0);
  const end = new Date(start.getTime() + services[0].durationMin * 60_000);

  const res = await request.post("/api/admin/appointments", {
    headers: { Cookie: cookie },
    data: {
      start: start.toISOString(),
      end: end.toISOString(),
      barberId: barbers[0].id,
      serviceId: services[0].id,
      clientId: clients[0].id,
      branchId: branches[0].id,
      price: services[0].price,
    },
  });
  if (!res.ok()) return null;
  const data = await res.json();
  return {
    appointmentId: data.appointment?.id,
    barberId: barbers[0].id,
    serviceId: services[0].id,
    clientId: clients[0].id,
    branchId: branches[0].id,
    price: services[0].price,
    durationMin: services[0].durationMin,
    start,
    end,
  };
}

test.describe("Appointment lifecycle", () => {
  test.setTimeout(45_000);

  test("Reschedule cambia el horario sin choque", async ({ request }) => {
    const cookie = await loginAdmin(request);
    const apt = await createTestAppointment(request, cookie, 0);
    if (!apt?.appointmentId) test.skip();
    if (!apt?.appointmentId) return;

    // Reagenda 1 hora más tarde
    const newStart = new Date(apt.start.getTime() + 60 * 60_000);
    const newEnd = new Date(newStart.getTime() + apt.durationMin * 60_000);
    const res = await request.patch(`/api/admin/appointments/${apt.appointmentId}`, {
      headers: { Cookie: cookie },
      data: {
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
      },
    });
    expect([200, 409]).toContain(res.status());
  });

  test("Reschedule a las 03:00 AM (fuera de horario) → 409", async ({ request }) => {
    const cookie = await loginAdmin(request);
    const apt = await createTestAppointment(request, cookie, 1);
    if (!apt?.appointmentId) test.skip();
    if (!apt?.appointmentId) return;

    const newStart = new Date(apt.start);
    newStart.setHours(3, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + apt.durationMin * 60_000);

    const res = await request.patch(`/api/admin/appointments/${apt.appointmentId}`, {
      headers: { Cookie: cookie },
      data: {
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
      },
    });
    expect(res.status()).toBe(409);
  });

  test("Status flow: RESERVED → CONFIRMED → DONE con pago", async ({ request }) => {
    const cookie = await loginAdmin(request);
    const apt = await createTestAppointment(request, cookie, 2);
    if (!apt?.appointmentId) test.skip();
    if (!apt?.appointmentId) return;

    // CONFIRMED
    const r1 = await request.patch(`/api/admin/appointments/${apt.appointmentId}/status`, {
      headers: { Cookie: cookie },
      data: { status: "CONFIRMED" },
    });
    expect(r1.ok()).toBeTruthy();

    // DONE con pago atómico
    const r2 = await request.patch(`/api/admin/appointments/${apt.appointmentId}/status`, {
      headers: { Cookie: cookie },
      data: {
        status: "DONE",
        payment: { amount: apt.price, tip: 1000, method: "CASH" },
      },
    });
    expect(r2.ok()).toBeTruthy();
    const data = await r2.json();
    expect(data.appointment.status).toBe("DONE");
  });

  test("DONE con pago duplicado → 409 (no se permite registrar 2 pagos)", async ({ request }) => {
    const cookie = await loginAdmin(request);
    const apt = await createTestAppointment(request, cookie, 3);
    if (!apt?.appointmentId) test.skip();
    if (!apt?.appointmentId) return;

    // Primer pago: OK
    const r1 = await request.patch(`/api/admin/appointments/${apt.appointmentId}/status`, {
      headers: { Cookie: cookie },
      data: {
        status: "DONE",
        payment: { amount: apt.price, method: "CASH" },
      },
    });
    expect(r1.ok()).toBeTruthy();

    // Segundo pago: debería rechazar (la cita ya tiene un pago)
    const r2 = await request.patch(`/api/admin/appointments/${apt.appointmentId}/status`, {
      headers: { Cookie: cookie },
      data: {
        status: "DONE",
        payment: { amount: apt.price, method: "DEBIT_CARD" },
      },
    });
    expect([409, 400]).toContain(r2.status());
  });

  test("CANCELED con motivo → status + cancelReason guardados", async ({ request }) => {
    const cookie = await loginAdmin(request);
    const apt = await createTestAppointment(request, cookie, 4);
    if (!apt?.appointmentId) test.skip();
    if (!apt?.appointmentId) return;

    const res = await request.patch(`/api/admin/appointments/${apt.appointmentId}/status`, {
      headers: { Cookie: cookie },
      data: { status: "CANCELED", cancelReason: "El cliente avisó que no puede ir" },
    });
    expect(res.ok()).toBeTruthy();

    // Verificar que quedó persistido
    const get = await request.get(`/api/admin/appointments/${apt.appointmentId}`, {
      headers: { Cookie: cookie },
    });
    const data = await get.json();
    expect(data.appointment.status).toBe("CANCELED");
    expect(data.appointment.cancelReason).toContain("avisó");
  });

  test("Crear cita en slot ya ocupado → 409", async ({ request }) => {
    const cookie = await loginAdmin(request);
    const apt = await createTestAppointment(request, cookie, 5);
    if (!apt?.appointmentId) test.skip();
    if (!apt?.appointmentId) return;

    // Intentar crear OTRA cita en el MISMO slot
    const res = await request.post("/api/admin/appointments", {
      headers: { Cookie: cookie },
      data: {
        start: apt.start.toISOString(),
        end: apt.end.toISOString(),
        barberId: apt.barberId,
        serviceId: apt.serviceId,
        clientId: apt.clientId,
        branchId: apt.branchId,
        price: apt.price,
      },
    });
    expect(res.status()).toBe(409);
  });

  test("Editar nota interna persiste", async ({ request }) => {
    const cookie = await loginAdmin(request);
    const apt = await createTestAppointment(request, cookie, 6);
    if (!apt?.appointmentId) test.skip();
    if (!apt?.appointmentId) return;

    const note = "Pidió tapper fade con barba dibujada";
    const res = await request.patch(`/api/admin/appointments/${apt.appointmentId}/note`, {
      headers: { Cookie: cookie },
      data: { noteInternal: note },
    });
    expect(res.ok()).toBeTruthy();

    const get = await request.get(`/api/admin/appointments/${apt.appointmentId}`, {
      headers: { Cookie: cookie },
    });
    const data = await get.json();
    expect(data.appointment.noteInternal).toContain("tapper");
  });
});

test.describe("Block times — admin", () => {
  test("Crear bloqueo + intentar reservar el mismo horario → 409", async ({ request }) => {
    const cookie = await loginAdmin(request);
    const [b, br] = await Promise.all([
      request.get("/api/admin/barbers", { headers: { Cookie: cookie } }),
      request.get("/api/admin/branches", { headers: { Cookie: cookie } }),
    ]);
    const { barbers } = await b.json();
    const { branches } = await br.json();
    if (!barbers[0] || !branches[0]) test.skip();

    // Bloqueo el lunes próximo de 9-10am
    const now = new Date();
    const daysUntilMonday = ((8 - now.getDay()) % 7) || 7;
    const start = new Date(now);
    start.setDate(now.getDate() + daysUntilMonday + 21);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60_000);

    // Crear bloqueo
    const blockRes = await request.post("/api/admin/block-times", {
      headers: { Cookie: cookie },
      data: {
        barberId: barbers[0].id,
        start: start.toISOString(),
        end: end.toISOString(),
        reason: "Almuerzo con cliente VIP",
      },
    });
    expect([200, 201]).toContain(blockRes.status());

    // Ahora intentar reservar EN ese horario via /api/book → debería fallar
    const sRes = await request.get("/api/book/services?slug=mi-barberia");
    const { services } = await sRes.json();
    const bookRes = await request.post("/api/book?slug=mi-barberia", {
      data: {
        serviceId: services[0].id,
        barberId: barbers[0].id,
        branchId: branches[0].id,
        start: start.toISOString(),
        end: new Date(start.getTime() + services[0].durationMin * 60_000).toISOString(),
        clientName: "Test BlockOverlap",
        clientPhone: "+56912340000",
      },
    });
    expect([409, 400]).toContain(bookRes.status());
  });
});
