import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const PATCH = withAdmin(async (req, { orgId }, { params }) => {
  const { id } = await params;

  // Verify payment belongs to org via appointment -> branch
  const payment = await prisma.payment.findFirst({
    where: { id, appointment: { branch: { orgId } } },
  });
  if (!payment) {
    throw AppError.notFound("Pago no encontrado");
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    throw AppError.badRequest("Datos inválidos");
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      ...(body.amount !== undefined ? { amount: Number(body.amount) } : {}),
      ...(body.method ? { method: body.method } : {}),
    },
  });

  return NextResponse.json({ payment: updated });
});
