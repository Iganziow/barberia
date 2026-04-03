import { NextResponse } from "next/server";
import { withPublic } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { getAppointmentById } from "@/lib/services/appointment.service";

export const GET = withPublic(async (_req, { params }) => {
  const { id } = await params;
  const apt = await getAppointmentById(id);

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
    },
  });
});
