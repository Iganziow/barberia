import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { getAppointmentById } from "@/lib/services/appointment.service";

export const GET = withAdmin(async (_req, { orgId }, { params }) => {
  const { id } = await params;
  const apt = await getAppointmentById(id, orgId);

  if (!apt) {
    throw AppError.notFound("Cita no encontrada");
  }

  return NextResponse.json({
    appointment: {
      id: apt.id,
      start: apt.start.toISOString(),
      end: apt.end.toISOString(),
      status: apt.status,
      price: apt.price,
      notePublic: apt.notePublic,
      noteInternal: apt.noteInternal,
      cancelReason: apt.cancelReason,
      barberId: apt.barberId,
      barberName: apt.barber.user.name,
      serviceId: apt.serviceId,
      serviceName: apt.service.name,
      serviceDuration: apt.service.durationMin,
      clientId: apt.clientId,
      clientName: apt.client.user.name,
      clientEmail: apt.client.user.email,
      clientPhone: apt.client.user.phone,
      payment: apt.payment
        ? {
            id: apt.payment.id,
            amount: apt.payment.amount,
            tip: apt.payment.tip,
            method: apt.payment.method,
            status: apt.payment.status,
            paidAt: apt.payment.paidAt?.toISOString() ?? null,
          }
        : null,
      createdAt: apt.createdAt.toISOString(),
    },
  });
});
