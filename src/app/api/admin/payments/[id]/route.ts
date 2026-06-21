import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

// Validación explícita del body. Antes hacía `Number(body.amount)` sin
// validar, lo que permitía NaN si vino "abc" → DB throw → 500 genérico.
// El enum de method ahora valida contra los valores de PaymentMethod
// del schema Prisma; cualquier otro string → 400 con mensaje claro.
const PaymentPatchSchema = z.object({
  amount: z.number().int().nonnegative().optional(),
  method: z
    .enum(["CASH", "DEBIT_CARD", "CREDIT_CARD", "TRANSFER", "OTHER"])
    .optional(),
}).refine((d) => d.amount !== undefined || d.method !== undefined, {
  message: "Debes incluir al menos un campo a actualizar",
});

export const PATCH = withAdmin(async (req, { orgId }, { params }) => {
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = PaymentPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify + update DENTRO de la misma transacción. Antes eran 2 queries
  // separadas — la verificación de ownership podía aprobar y el update
  // ejecutarse mientras el row cambiaba de org (escenario teórico bajo
  // re-asignación de branches). Atomicidad cierra el TOCTOU.
  const updated = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id, appointment: { branch: { orgId } } },
      select: { id: true },
    });
    if (!payment) return null;
    return tx.payment.update({
      where: { id },
      data: {
        ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
        ...(parsed.data.method ? { method: parsed.data.method } : {}),
      },
    });
  });

  if (!updated) throw AppError.notFound("Pago no encontrado");
  return NextResponse.json({ payment: updated });
});
