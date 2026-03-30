import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getAppointmentById } from "@/lib/services/appointment.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
    const { id } = await params;
    const apt = await getAppointmentById(id, orgId);

    if (!apt) {
      return NextResponse.json({ message: "Cita no encontrada" }, { status: 404 });
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
  } catch (err) {
    console.error("GET /api/admin/appointments/[id] failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
