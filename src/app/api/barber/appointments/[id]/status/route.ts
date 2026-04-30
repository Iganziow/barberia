import { NextResponse } from "next/server";
import { withBarber } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { stripHtml } from "@/lib/sanitize";
import { invalidateAvailability } from "@/lib/cache/availability-cache";

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
  // Payment opcional: igual que en el admin, si se envía junto con
  // status=DONE se crea en la misma transacción atómica.
  payment: z
    .object({
      amount: z.number().int().nonnegative(),
      tip: z.number().int().nonnegative().default(0),
      method: z
        .enum(["CASH", "DEBIT_CARD", "CREDIT_CARD", "TRANSFER", "OTHER"])
        .default("CASH"),
    })
    .optional(),
});

export const PATCH = withBarber(async (req, { userId }, { params }) => {
  const { id } = await params;

  const barber = await prisma.barber.findUnique({ where: { userId } });
  if (!barber) {
    throw AppError.notFound("Barbero no encontrado");
  }

  // Verifica que la cita pertenezca a este barbero. Traemos branchId
  // también para poder invalidar el caché de availability tras el cambio.
  const appointment = await prisma.appointment.findFirst({
    where: { id, barberId: barber.id },
    select: { id: true, status: true, branchId: true, payment: { select: { id: true } } },
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

  // Si piden crear payment pero ya existe, evitamos duplicados
  if (parsed.data.payment && appointment.payment) {
    return NextResponse.json(
      { message: "Esta cita ya tiene un pago registrado" },
      { status: 400 }
    );
  }

  // Atómico: payment (si aplica) + cambio de status. Si falla cualquiera,
  // ninguno persiste — evita el caso "registré el pago pero no avancé el
  // estado" que dejaría la cita inconsistente.
  const updated = await prisma.$transaction(async (tx) => {
    if (parsed.data.payment) {
      await tx.payment.create({
        data: {
          appointmentId: id,
          amount: parsed.data.payment.amount,
          tip: parsed.data.payment.tip,
          method: parsed.data.payment.method,
          status: "PAID",
          paidAt: new Date(),
        },
      });
    }
    return tx.appointment.update({
      where: { id },
      data: {
        status: parsed.data.status,
        ...(parsed.data.status === "CANCELED" && parsed.data.cancelReason
          ? { cancelReason: parsed.data.cancelReason }
          : {}),
      },
      select: { id: true, status: true, cancelReason: true },
    });
  });

  // Invalida availability — el cambio de status (especialmente CANCELED
  // o NO_SHOW) libera/ocupa slots; debe verse en el flujo público sin
  // esperar TTL.
  invalidateAvailability({ barberId: barber.id, branchId: appointment.branchId });

  return NextResponse.json({ appointment: updated });
});
