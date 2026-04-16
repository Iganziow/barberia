import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import {
  getAppointmentById,
  rescheduleAppointment,
} from "@/lib/services/appointment.service";

const RescheduleSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  barberId: z.string().min(1).optional(),
});

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

/**
 * PATCH: reprogramar cita (drag-to-reschedule, resize, o mover a otro barbero).
 * Valida overlap con otras citas activas y bloqueos del barbero destino.
 */
export const PATCH = withAdmin(async (req, { orgId }, { params }) => {
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = RescheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const updated = await rescheduleAppointment(id, parsed.data, orgId);
    if (!updated) throw AppError.notFound("Cita no encontrada");
    return NextResponse.json({ appointment: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al reprogramar";
    throw AppError.conflict(msg);
  }
});
