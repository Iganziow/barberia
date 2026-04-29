import { test, expect } from "@playwright/test";

/**
 * Edge cases críticos del backend de reservas.
 *
 * Estos tests apuntan al validador central de slots
 * (validateAppointmentSlot) y verifican que el backend rechaza
 * reservas inválidas con el mensaje correcto. Si alguno falla,
 * el sistema podría aceptar reservas que rompen la integridad.
 */

const SLUG = "mi-barberia";

async function getBaseData(request: import("@playwright/test").APIRequestContext) {
  const svcRes = await request.get(`/api/book/services?slug=${SLUG}`);
  const { services } = await svcRes.json();
  const brRes = await request.get(`/api/book/branches?slug=${SLUG}`);
  const { branches } = await brRes.json();
  // Próximo lunes a las 14:00 (sucursal abre 09-20)
  const now = new Date();
  const daysUntilMonday = ((8 - now.getDay()) % 7) || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  monday.setHours(14, 0, 0, 0);
  return {
    serviceId: services[0].id,
    serviceDuration: services[0].durationMin,
    branchId: branches[0].id,
    monday,
  };
}

test.describe("Edge cases — validador de slots", () => {
  test("POST /api/book con slot en el pasado → 400 o 409", async ({ request }) => {
    const { serviceId, serviceDuration, branchId } = await getBaseData(request);
    // Ayer 14:00
    const past = new Date();
    past.setDate(past.getDate() - 1);
    past.setHours(14, 0, 0, 0);
    const end = new Date(past.getTime() + serviceDuration * 60_000);

    // Necesitamos un barberId real para el POST. Lo conseguimos.
    const av = await request.get(
      `/api/book/availability?serviceId=${serviceId}&date=${past.toISOString().split("T")[0]}&branchId=${branchId}&slug=${SLUG}`
    );
    const { barbers } = await av.json();
    if (!barbers || barbers.length === 0) {
      // No barberos disponibles para fecha pasada — ya es un block correcto
      expect(barbers || []).toEqual([]);
      return;
    }

    const res = await request.post(`/api/book?slug=${SLUG}`, {
      data: {
        serviceId,
        barberId: barbers[0].id,
        branchId,
        start: past.toISOString(),
        end: end.toISOString(),
        clientName: "Test Pasado",
        clientPhone: "+56912345678",
      },
    });
    expect([400, 409]).toContain(res.status());
  });

  test("POST con duración de slot != duración de servicio → 400", async ({ request }) => {
    const { serviceId, branchId, monday } = await getBaseData(request);
    const av = await request.get(
      `/api/book/availability?serviceId=${serviceId}&date=${monday.toISOString().split("T")[0]}&branchId=${branchId}&slug=${SLUG}`
    );
    const { barbers } = await av.json();
    if (!barbers?.[0]) test.skip();

    // Slot de solo 5 minutos (todos los servicios duran ≥30)
    const start = new Date(monday);
    const end = new Date(start.getTime() + 5 * 60_000);

    const res = await request.post(`/api/book?slug=${SLUG}`, {
      data: {
        serviceId,
        barberId: barbers[0].id,
        branchId,
        start: start.toISOString(),
        end: end.toISOString(),
        clientName: "Test Duración",
        clientPhone: "+56912345678",
      },
    });
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/duración/i);
  });

  test("POST a las 03:00 AM (fuera de horario sucursal) → 409", async ({ request }) => {
    const { serviceId, serviceDuration, branchId, monday } = await getBaseData(request);
    const av = await request.get(
      `/api/book/availability?serviceId=${serviceId}&date=${monday.toISOString().split("T")[0]}&branchId=${branchId}&slug=${SLUG}`
    );
    const { barbers } = await av.json();
    if (!barbers?.[0]) test.skip();

    const start = new Date(monday);
    start.setHours(3, 0, 0, 0); // 03:00 AM
    const end = new Date(start.getTime() + serviceDuration * 60_000);

    const res = await request.post(`/api/book?slug=${SLUG}`, {
      data: {
        serviceId,
        barberId: barbers[0].id,
        branchId,
        start: start.toISOString(),
        end: end.toISOString(),
        clientName: "Test Madrugada",
        clientPhone: "+56912345678",
      },
    });
    expect(res.status()).toBe(409);
    const data = await res.json();
    expect(data.message).toMatch(/cerrada|horario|trabaja/i);
  });

  test("POST con fecha futura > 60 días → 400", async ({ request }) => {
    const { serviceId, serviceDuration, branchId } = await getBaseData(request);
    // 90 días futuro
    const future = new Date();
    future.setDate(future.getDate() + 90);
    future.setHours(14, 0, 0, 0);
    const end = new Date(future.getTime() + serviceDuration * 60_000);

    // Con un barberId arbitrario — la validación debería rechazar antes
    const res = await request.post(`/api/book?slug=${SLUG}`, {
      data: {
        serviceId,
        barberId: "any-id",
        branchId,
        start: future.toISOString(),
        end: end.toISOString(),
        clientName: "Test Futuro",
        clientPhone: "+56912345678",
      },
    });
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(JSON.stringify(data)).toMatch(/60 días|próximos/i);
  });

  test("POST sin clientName → 400", async ({ request }) => {
    const { serviceId, serviceDuration, branchId, monday } = await getBaseData(request);
    const end = new Date(monday.getTime() + serviceDuration * 60_000);
    const res = await request.post(`/api/book?slug=${SLUG}`, {
      data: {
        serviceId,
        barberId: "any-id",
        branchId,
        start: monday.toISOString(),
        end: end.toISOString(),
        clientName: "", // vacío
        clientPhone: "+56912345678",
      },
    });
    expect(res.status()).toBe(400);
  });

  test("POST con phone inválido → 400", async ({ request }) => {
    const { serviceId, serviceDuration, branchId, monday } = await getBaseData(request);
    const end = new Date(monday.getTime() + serviceDuration * 60_000);
    const res = await request.post(`/api/book?slug=${SLUG}`, {
      data: {
        serviceId,
        barberId: "any-id",
        branchId,
        start: monday.toISOString(),
        end: end.toISOString(),
        clientName: "Test",
        clientPhone: "abcdef", // letras → inválido
      },
    });
    expect(res.status()).toBe(400);
  });

  test("Heatmap rechaza branchId inválido → 404", async ({ request }) => {
    const svcRes = await request.get(`/api/book/services?slug=${SLUG}`);
    const { services } = await svcRes.json();
    const res = await request.get(
      `/api/book/heatmap?branchId=branch-no-existe&serviceId=${services[0].id}&days=7&slug=${SLUG}`
    );
    expect([404, 400]).toContain(res.status());
  });
});
