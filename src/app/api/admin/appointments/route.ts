import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import {
  getAppointments,
} from "@/lib/services/appointment.service";
import {
  validateAppointmentSlot,
  slotConflictMessage,
  acquireBarberLock,
} from "@/lib/services/availability.service";
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
      paid: !!a.payment,
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
  const data = parsed.data;

  // Verify branch belongs to org
  const branch = await prisma.branch.findFirst({
    where: { id: data.branchId, orgId },
    select: { id: true },
  });
  if (!branch) {
    throw AppError.notFound("Sucursal no encontrada");
  }

  // Verify barber belongs to org y trae sus servicios para validar
  // que ofrezca el servicio solicitado. Antes solo chequeábamos la
  // existencia del barbero — el admin podía crear citas con servicios
  // que el barbero no realiza.
  const barber = await prisma.barber.findFirst({
    where: { id: data.barberId, branch: { orgId } },
    include: { services: { where: { serviceId: data.serviceId } } },
  });
  if (!barber) {
    throw AppError.notFound("Barbero no encontrado");
  }
  if (barber.services.length === 0) {
    throw AppError.badRequest("Este barbero no ofrece el servicio seleccionado");
  }

  // Validar duración del slot vs servicio (mismo invariante que en público).
  const service = await prisma.service.findFirst({
    where: { id: data.serviceId, orgId },
    select: { durationMin: true },
  });
  if (!service) {
    throw AppError.notFound("Servicio no encontrado");
  }
  const slotDurationMs = new Date(data.end).getTime() - new Date(data.start).getTime();
  const slotDurationMin = Math.round(slotDurationMs / 60_000);
  if (slotDurationMin !== service.durationMin) {
    throw AppError.badRequest("La duración del horario no coincide con el servicio");
  }

  // Validación atómica de schedule + overlap dentro de transacción. Para
  // admin permitimos crear citas en el pasado (rejectPast: false) — útil
  // para registrar walk-ins que olvidaron cargar — pero seguimos
  // bloqueando overlaps y horarios fuera de schedule.
  const appointment = await prisma.$transaction(async (tx) => {
    // Lock advisory por barbero — previene race condition de inserts
    // concurrentes (crítico para multi-staff admins reservando al mismo
    // tiempo).
    await acquireBarberLock(tx as unknown as typeof prisma, data.barberId);

    const conflict = await validateAppointmentSlot(
      tx as unknown as typeof prisma,
      {
        barberId: data.barberId,
        branchId: data.branchId,
        start: new Date(data.start),
        end: new Date(data.end),
      },
      { rejectPast: false }
    );
    if (conflict) {
      throw new Error(`SLOT_INVALID:${slotConflictMessage(conflict)}`);
    }
    return tx.appointment.create({
      data: {
        start: new Date(data.start),
        end: new Date(data.end),
        price: data.price,
        barberId: data.barberId,
        serviceId: data.serviceId,
        clientId: data.clientId,
        branchId: data.branchId,
        notePublic: data.notePublic || null,
        noteInternal: data.noteInternal || null,
      },
    });
  }).catch((err: Error) => {
    if (err.message.startsWith("SLOT_INVALID:")) {
      throw AppError.conflict(err.message.slice("SLOT_INVALID:".length));
    }
    throw err;
  });

  return NextResponse.json({ appointment }, { status: 201 });
});
