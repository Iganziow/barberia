import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import {
  getAppointments,
  createAppointment,
} from "@/lib/services/appointment.service";
import { CreateAppointmentSchema } from "@/lib/validations/appointment";
import { parseDate } from "@/lib/sanitize";

export const GET = withAdmin(async (req, { orgId }) => {
  const { searchParams } = new URL(req.url);

  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const from = fromStr ? parseDate(fromStr) : undefined;
  const to = toStr ? parseDate(toStr) : undefined;

  if ((fromStr && !from) || (toStr && !to)) {
    throw AppError.badRequest("Formato de fecha inválido");
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
});

export const POST = withAdmin(async (req, { orgId }) => {
  const json = await req.json().catch(() => null);
  const parsed = CreateAppointmentSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos.", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify branch belongs to org
  const branch = await prisma.branch.findFirst({
    where: { id: parsed.data.branchId, orgId },
    select: { id: true },
  });
  if (!branch) {
    throw AppError.notFound("Sucursal no encontrada");
  }

  // Verify barber belongs to org
  const barber = await prisma.barber.findFirst({
    where: { id: parsed.data.barberId, branch: { orgId } },
    select: { id: true },
  });
  if (!barber) {
    throw AppError.notFound("Barbero no encontrado");
  }

  const appointment = await createAppointment(parsed.data);

  return NextResponse.json({ appointment }, { status: 201 });
});
