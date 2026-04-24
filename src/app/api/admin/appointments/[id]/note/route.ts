import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/api-handler";
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
 * PATCH /api/admin/appointments/[id]/note
 *
 * Actualiza SOLO el campo noteInternal de una cita. Endpoint separado
 * del PATCH general (que hace reschedule) para que el UI pueda guardar
 * notas sin tocar fecha/hora — importante en el flujo "el cliente vino,
 * quiero anotar lo que pidió" post-cierre.
 *
 * Se puede llamar en cualquier momento (también después de DONE) para
 * editar la nota del historial.
 */
export const PATCH = withAdmin(async (req, { orgId }, { params }) => {
  const { id } = await params;

  // Verifica que la cita pertenezca al org antes de actualizar
  const apt = await prisma.appointment.findFirst({
    where: { id, branch: { orgId } },
    select: { id: true },
  });
  if (!apt) throw AppError.notFound("Cita no encontrada");

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
    data: {
      noteInternal: parsed.data.noteInternal ?? null,
    },
    select: { id: true, noteInternal: true },
  });

  return NextResponse.json({ appointment: updated });
});
