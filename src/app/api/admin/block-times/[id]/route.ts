import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { invalidateAvailability } from "@/lib/cache/availability-cache";

export const DELETE = withAdmin(async (_req, { orgId }, { params }) => {
  const { id } = await params;

  // Traemos barberId + branchId para invalidar el caché tras el delete.
  const block = await prisma.blockTime.findFirst({
    where: { id, barber: { branch: { orgId } } },
    select: { id: true, barberId: true, barber: { select: { branchId: true } } },
  });
  if (!block) throw AppError.notFound("Bloqueo no encontrado");

  await prisma.blockTime.delete({ where: { id } });

  // Bloqueo eliminado = slots libres → invalidar disponibilidad.
  invalidateAvailability({ barberId: block.barberId, branchId: block.barber.branchId });

  return NextResponse.json({ ok: true });
});
