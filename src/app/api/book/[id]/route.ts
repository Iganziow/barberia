import { NextResponse } from "next/server";
import { withPublic } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { getAppointmentById } from "@/lib/services/appointment.service";
import { getOrgIdFromHeaders } from "@/lib/tenant";

export const GET = withPublic(async (req, { params }) => {
  const { id } = await params;

  // Scope la lookup al org del request (resuelto vía slug header/query).
  // Sin esto cualquiera con un cuid válido podía leer citas de cualquier
  // org — IDOR P0 detectado en auditoría 2026-04-30. La página de
  // confirmación vive bajo `/[slug]/book/confirmation`, así que el slug
  // viene naturalmente en los headers (middleware setea x-org-slug).
  const orgId = await getOrgIdFromHeaders(req);
  const apt = await getAppointmentById(id, orgId);

  if (!apt) {
    throw AppError.notFound("Reserva no encontrada");
  }

  // Only expose safe public info
  return NextResponse.json({
    booking: {
      id: apt.id,
      start: apt.start.toISOString(),
      end: apt.end.toISOString(),
      status: apt.status,
      price: apt.price,
      barberName: apt.barber.user.name,
      serviceName: apt.service.name,
      serviceDuration: apt.service.durationMin,
      clientName: apt.client.user.name,
      branch: {
        name: apt.branch.name,
        address: apt.branch.address,
        phone: apt.branch.phone,
        latitude: apt.branch.latitude,
        longitude: apt.branch.longitude,
        orgName: apt.branch.organization?.name ?? null,
      },
    },
  });
});
