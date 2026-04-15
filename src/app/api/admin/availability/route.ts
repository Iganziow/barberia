import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import {
  getAvailableSlots,
  getBarbersWithAvailability,
} from "@/lib/services/availability.service";
import { getServiceById } from "@/lib/services/service.service";

/**
 * Admin-only availability lookup. A thin wrapper sobre availability.service
 * que aplica requireAdmin. Usado por la "Búsqueda rápida de hora" del agenda.
 *
 * Query params:
 * - serviceId (requerido)
 * - date (YYYY-MM-DD, requerido)
 * - barberId (opcional: devuelve slots para ese barbero)
 * - branchId (opcional: devuelve lista de barberos con conteo de slots)
 */
export const GET = withAdmin(async (req) => {
  const { searchParams } = new URL(req.url);
  const barberId = searchParams.get("barberId");
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");
  const branchId = searchParams.get("branchId");

  if (!date || !serviceId) {
    throw AppError.badRequest("Se requiere date y serviceId");
  }

  const service = await getServiceById(serviceId);
  if (!service) throw AppError.notFound("Servicio no encontrado");

  if (barberId) {
    const slots = await getAvailableSlots(barberId, date, service.durationMin);
    return NextResponse.json({ slots });
  }

  if (branchId) {
    const barbers = await getBarbersWithAvailability(
      branchId,
      date,
      service.durationMin
    );
    return NextResponse.json({ barbers });
  }

  throw AppError.badRequest("Se requiere barberId o branchId");
});
