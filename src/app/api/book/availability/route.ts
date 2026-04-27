import { NextResponse } from "next/server";
import { withPublic } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import {
  getAvailableSlots,
  getBarbersWithAvailability,
} from "@/lib/services/availability.service";
import { getServices } from "@/lib/services/service.service";
import { getOrgIdFromHeaders } from "@/lib/tenant";

export const GET = withPublic(async (req) => {
  const { searchParams } = new URL(req.url);
  const barberId = searchParams.get("barberId");
  const date = searchParams.get("date"); // YYYY-MM-DD
  const serviceId = searchParams.get("serviceId");
  const branchId = searchParams.get("branchId");

  if (!date || !serviceId) {
    throw AppError.badRequest("Se requiere date y serviceId");
  }

  // Validate date is not in the past
  const today = new Date().toISOString().split("T")[0];
  if (date < today) {
    return NextResponse.json({ slots: [], barbers: [] });
  }

  // Validate date is not too far in the future (60 días). Sin este límite,
  // un cliente podía reservar para 2030 — barberos sin schedule cargado,
  // posibles cambios de precios/políticas, etc.
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  const maxDateStr = maxDate.toISOString().split("T")[0];
  if (date > maxDateStr) {
    return NextResponse.json({ slots: [], barbers: [] });
  }

  // Get service duration
  const orgId = await getOrgIdFromHeaders(req);
  const services = await getServices(orgId);
  const service = services.find((s) => s.id === serviceId);
  if (!service) {
    throw AppError.notFound("Servicio no encontrado");
  }

  // If barberId specified, return slots for that barber. Usamos
  // customDuration del BarberService si existe — un barbero puede tener
  // duración custom para un servicio (ej: Daniel hace "Corte" en 45 min
  // mientras el resto lo hace en 30). Sin esto, los slots se generaban
  // con la duración base y el POST fallaba al validar duración efectiva.
  if (barberId) {
    const barberService = await prisma.barberService.findUnique({
      where: { barberId_serviceId: { barberId, serviceId } },
      select: { customDuration: true },
    });
    const effectiveDuration = barberService?.customDuration ?? service.durationMin;
    const slots = await getAvailableSlots(barberId, date, effectiveDuration);
    return NextResponse.json({ slots });
  }

  // Otherwise return barbers with availability count — filtramos por
  // serviceId para no listar barberos que no ofrecen el servicio.
  // Nota: usamos la duración base aquí porque cada barbero puede tener
  // su propia customDuration; el conteo es aproximado pero suficiente
  // para mostrar "X horarios disponibles".
  if (branchId) {
    const barbers = await getBarbersWithAvailability(
      branchId,
      date,
      service.durationMin,
      serviceId
    );
    return NextResponse.json({ barbers });
  }

  throw AppError.badRequest("Se requiere barberId o branchId");
});
