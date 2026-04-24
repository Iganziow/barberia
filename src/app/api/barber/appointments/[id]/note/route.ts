import { NextResponse } from "next/server";
import { z } from "zod";
import { withBarber } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/sanitize";

const UpdateNoteSchema = z.object({
  noteInternal: z
    .string()
    .max(2000, "La nota no puede tener más de 2000 caracteres")
    .transform(stripHtml)
    .nullable()
    .optional(),
});

/**
 * PATCH /api/barber/appointments/[id]/note
 *
 * El barbero puede editar la nota interna de sus propias citas en cualquier
 * momento. Este es el flujo core del feature "cliente X pidió Y":
 * cuando atiende a un cliente, anota preferencias para consultar la
 * próxima vez que el cliente vuelva.
 *
 * Scope: solo citas donde barberId === userId del barbero logueado.
 */
export const PATCH = withBarber(async (req, { userId }, { params }) => {
  const { id } = await params;

  const barber = await prisma.barber.findUnique({ where: { userId } });
  if (!barber) throw AppError.notFound("Barbero no encontrado");

  // Verifica que la cita pertenezca a este barbero (multi-tenant + barber-scope)
  const appointment = await prisma.appointment.findFirst({
    where: { id, barberId: barber.id },
    select: { id: true },
  });
  if (!appointment) throw AppError.notFound("Cita no encontrada");

  const body = await req.json().catch(() => null);
  const parsed = UpdateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { noteInternal: parsed.data.noteInternal ?? null },
    select: { id: true, noteInternal: true },
  });

  return NextResponse.json({ appointment: updated });
});
