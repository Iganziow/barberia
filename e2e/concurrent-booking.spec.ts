import { test, expect } from "@playwright/test";

/**
 * Race conditions del POST /api/book.
 *
 * Estos tests son críticos: si fallan significa que dos clientes
 * pueden reservar el MISMO slot al mismo tiempo y la integridad
 * se rompe. La transacción atómica + validateAppointmentSlot
 * deberían garantizar que solo uno gana.
 *
 * Cada test usa un X-Forwarded-For único para no chocar con el
 * rate limiter de otros specs.
 */

const SLUG = "mi-barberia";

// IP única por test → bucket de rate-limit independiente.
// Random para que reruns no choquen.
function uniqueIp() {
  return `10.0.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
}

/**
 * Encuentra un slot libre en alguna fecha futura. Va probando días
 * cada vez más adelante hasta encontrar uno con slots disponibles.
 * Esto hace el test resiliente entre corridas (los slots tomados ya
 * no aparecen en availability).
 */
async function getSlot(request: import("@playwright/test").APIRequestContext) {
  const svcRes = await request.get(`/api/book/services?slug=${SLUG}`);
  const { services } = await svcRes.json();
  const brRes = await request.get(`/api/book/branches?slug=${SLUG}`);
  const { branches } = await brRes.json();

  // Probar varios días hasta encontrar uno con slots libres
  for (let offset = 7; offset <= 56; offset += 7) {
    const target = new Date();
    target.setDate(target.getDate() + offset);
    // Asegurar que sea Lun-Sáb (sucursal cerrada domingo)
    if (target.getDay() === 0) target.setDate(target.getDate() + 1);
    const dateStr = target.toISOString().split("T")[0];

    const barbRes = await request.get(
      `/api/book/availability?serviceId=${services[0].id}&date=${dateStr}&branchId=${branches[0].id}&slug=${SLUG}`
    );
    const { barbers } = await barbRes.json();
    const availableBarber = barbers?.find((b: { availableSlots: number }) => b.availableSlots > 0);
    if (!availableBarber) continue;

    const slotsRes = await request.get(
      `/api/book/availability?serviceId=${services[0].id}&date=${dateStr}&barberId=${availableBarber.id}&slug=${SLUG}`
    );
    const { slots } = await slotsRes.json();
    if (!slots || slots.length === 0) continue;

    return {
      serviceId: services[0].id,
      branchId: branches[0].id,
      barberId: availableBarber.id,
      // Último slot del día — menos probable de estar tomado
      slot: slots[slots.length - 1],
    };
  }
  return null;
}

test.describe("Race conditions — concurrent booking", () => {
  test.setTimeout(45_000);

  test("dos POSTs simultáneos al MISMO slot → solo uno gana, otro 409", async ({ request }) => {
    const data = await getSlot(request);
    if (!data) test.skip();
    if (!data) return;

    const ip = uniqueIp();
    const payload = {
      serviceId: data.serviceId,
      barberId: data.barberId,
      branchId: data.branchId,
      start: data.slot.start,
      end: data.slot.end,
      clientName: "Test Concurrent",
      clientPhone: `+5691234${Math.floor(1000 + Math.random() * 9000)}`,
    };
    const payload2 = { ...payload, clientName: "Test Concurrent 2", clientPhone: `+5691234${Math.floor(1000 + Math.random() * 9000)}` };

    const [r1, r2] = await Promise.all([
      request.post(`/api/book?slug=${SLUG}`, { data: payload, headers: { "x-forwarded-for": ip } }),
      request.post(`/api/book?slug=${SLUG}`, { data: payload2, headers: { "x-forwarded-for": ip } }),
    ]);

    const statuses = [r1.status(), r2.status()].sort();
    // Esperado: uno 201 (creado) + uno 409 (slot tomado).
    // Si el slot estaba tomado por una corrida previa, ambos podrían ser 409
    // (pero como usamos +14 días, no debería pasar).
    expect(statuses).toEqual([201, 409]);

    const losingRes = r1.status() === 409 ? r1 : r2;
    const errBody = await losingRes.json();
    expect(errBody.message).toMatch(/disponible|cita|horario/i);
  });

  test("tres POSTs simultáneos al MISMO slot → solo uno gana, dos 409", async ({ request }) => {
    const data = await getSlot(request);
    if (!data) test.skip();
    if (!data) return;

    const ip = uniqueIp();
    const mkPayload = (n: number) => ({
      serviceId: data.serviceId,
      barberId: data.barberId,
      branchId: data.branchId,
      // Slot distinto: el 2do más cercano al medio
      start: data.slot.start,
      end: data.slot.end,
      clientName: `Triple ${n}`,
      clientPhone: `+5691234${5000 + n}`,
    });

    const responses = await Promise.all([
      request.post(`/api/book?slug=${SLUG}`, { data: mkPayload(1), headers: { "x-forwarded-for": ip } }),
      request.post(`/api/book?slug=${SLUG}`, { data: mkPayload(2), headers: { "x-forwarded-for": ip } }),
      request.post(`/api/book?slug=${SLUG}`, { data: mkPayload(3), headers: { "x-forwarded-for": ip } }),
    ]);

    const statuses = responses.map((r) => r.status()).sort();
    const created = statuses.filter((s) => s === 201).length;
    const conflicts = statuses.filter((s) => s === 409).length;
    // Lo importante: NO MÁS DE UN 201 (no se duplicó la cita).
    expect(created).toBeLessThanOrEqual(1);
    expect(created + conflicts).toBe(3);
  });
});
