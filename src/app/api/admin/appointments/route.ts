import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import {
  getAppointments,
  createAppointment,
} from "@/lib/services/appointment.service";
import { CreateAppointmentSchema } from "@/lib/validations/appointment";
import { parseDate } from "@/lib/sanitize";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
    const { searchParams } = new URL(req.url);

    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const from = fromStr ? parseDate(fromStr) : undefined;
    const to = toStr ? parseDate(toStr) : undefined;

    if ((fromStr && !from) || (toStr && !to)) {
      return NextResponse.json({ message: "Formato de fecha inválido" }, { status: 400 });
    }

    const appointments = await getAppointments({
      orgId,
      branchId: searchParams.get("branchId") || undefined,
      barberId: searchParams.get("barberId") || undefined,
      from: from ?? undefined,
      to: to ?? undefined,
    });

    return NextResponse.json({
      appointments: appointments.map((a) => ({
        id: a.id,
        start: a.start.toISOString(),
        end: a.end.toISOString(),
        status: a.status,
        price: a.price,
        notePublic: a.notePublic,
        noteInternal: a.noteInternal,
        barberId: a.barberId,
        barberName: a.barber.user.name,
        serviceId: a.serviceId,
        serviceName: a.service.name,
        clientId: a.clientId,
        clientName: a.client.user.name,
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/appointments failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const json = await req.json().catch(() => null);
    const parsed = CreateAppointmentSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos inválidos.", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const appointment = await createAppointment(parsed.data);

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/appointments failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
