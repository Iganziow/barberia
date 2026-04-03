import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { CommissionType } from "@prisma/client";

export const PATCH = withAdmin(async (req, { orgId }, { params }) => {
  const { id: barberId } = await params;

  // Verify barber belongs to org
  const barber = await prisma.barber.findFirst({ where: { id: barberId, branch: { orgId } } });
  if (!barber) throw AppError.notFound("Barbero no encontrado");

  const body = await req.json().catch(() => null);
  if (!body) throw AppError.badRequest("JSON inválido");

  const { commissionType, commissionValue } = body as {
    commissionType: CommissionType;
    commissionValue: number;
  };

  if (!["PERCENTAGE", "FIXED"].includes(commissionType) || typeof commissionValue !== "number" || commissionValue < 0) {
    throw AppError.badRequest("Datos inválidos");
  }
  if (commissionType === "PERCENTAGE" && commissionValue > 100) {
    throw AppError.badRequest("El porcentaje no puede ser mayor a 100");
  }

  const updated = await prisma.barber.update({
    where: { id: barberId },
    data: { commissionType, commissionValue },
  });

  return NextResponse.json({ ok: true, commissionType: updated.commissionType, commissionValue: updated.commissionValue });
});
