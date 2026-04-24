import { NextResponse } from "next/server";
import { withBarber } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { stripHtml } from "@/lib/sanitize";

// El barbero puede avanzar su propio flujo de la cita con el mismo
// conjunto de estados que el admin (Arrived / InProgress / Done), y
// también cancelar con motivo — importante para recordarlo después si
// el cliente reclama. NO puede reactivar a CONFIRMED desde el barbero
// (eso es responsabilidad del admin si el cliente llama para confirmar).
const StatusSchema = z.object({
  status: z.enum([
    "RESERVED",
    "ARRIVED",
    "IN_PROGRESS",
    "DONE",
    "NO_SHOW",
    "CANCELED",
  ]),
  cancelReason: z
    .string()
    .max(500, "El motivo no puede tener más de 500 caracteres")
    .transform(stripHtml)
    .nullable()
    .optional(),
});

export const PATCH = withBarber(async (req, { userId }, { params }) => {
  const { id } = await params;

  const barber = await prisma.barber.findUnique({ where: { userId } });
  if (!barber) {
    throw AppError.notFound("Barbero no encontrado");
  }

  // Verifica que la cita pertenezca a este barbero
  const appointment = await prisma.appointment.findFirst({
    where: { id, barberId: barber.id },
    select: { id: true, status: true },
  });
  if (!appointment) {
    throw AppError.notFound("Cita no encontrada");
  }

  const json = await req.json().catch(() => null);
  const parsed = StatusSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: parsed.data.status,
      // Guardamos el motivo sólo si se está cancelando
      ...(parsed.data.status === "CANCELED" && parsed.data.cancelReason
        ? { cancelReason: parsed.data.cancelReason }
        : {}),
    },
    select: { id: true, status: true, cancelReason: true },
  });

  return NextResponse.json({ appointment: updated });
});
