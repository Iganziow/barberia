import { NextResponse } from "next/server";
import { withPublic } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
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

  // Get service duration
  const orgId = await getOrgIdFromHeaders(req);
  const services = await getServices(orgId);
  const service = services.find((s) => s.id === serviceId);
  if (!service) {
    throw AppError.notFound("Servicio no encontrado");
  }

  // If barberId specified, return slots for that barber
  if (barberId) {
    const slots = await getAvailableSlots(barberId, date, service.durationMin);
    return NextResponse.json({ slots });
  }

  // Otherwise return barbers with availability count
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
