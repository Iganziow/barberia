import { NextResponse } from "next/server";
import { withBarber } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const StatusSchema = z.object({
  status: z.enum(["DONE", "NO_SHOW", "RESERVED"]),
});

export const PATCH = withBarber(async (req, { userId }, { params }) => {
  const { id } = await params;

  const barber = await prisma.barber.findUnique({ where: { userId } });
  if (!barber) {
    throw AppError.notFound("Barbero no encontrado");
  }

  // Verify appointment belongs to this barber
  const appointment = await prisma.appointment.findFirst({
    where: { id, barberId: barber.id },
  });
  if (!appointment) {
    throw AppError.notFound("Cita no encontrada");
  }

  const json = await req.json().catch(() => null);
  const parsed = StatusSchema.safeParse(json);
  if (!parsed.success) {
    throw AppError.badRequest("Datos inválidos");
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: parsed.data.status },
    select: { id: true, status: true },
  });

  return NextResponse.json({ appointment: updated });
});
