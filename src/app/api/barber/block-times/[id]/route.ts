import { NextResponse } from "next/server";
import { withBarber } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { invalidateAvailability } from "@/lib/cache/availability-cache";

export const DELETE = withBarber(async (_req, { userId }, { params }) => {
  const { id } = await params;

  const barber = await prisma.barber.findUnique({
    where: { userId },
    select: { id: true, branchId: true },
  });
  if (!barber) throw AppError.notFound("Barbero no encontrado");

  // Verify block belongs to this barber
  const block = await prisma.blockTime.findFirst({
    where: { id, barberId: barber.id },
  });
  if (!block) throw AppError.notFound("Bloqueo no encontrado");

  await prisma.blockTime.delete({ where: { id } });

  // Bloqueo eliminado = slots libres.
  invalidateAvailability({ barberId: barber.id, branchId: barber.branchId });

  return NextResponse.json({ ok: true });
});
