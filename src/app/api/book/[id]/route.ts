import { NextResponse } from "next/server";
import { getAppointmentById } from "@/lib/services/appointment.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const apt = await getAppointmentById(id);

    if (!apt) {
      return NextResponse.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );
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
  } catch (err) {
    console.error("GET /api/book/[id] failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
