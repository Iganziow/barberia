import { NextResponse } from "next/server";
import { withBarber } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const DELETE = withBarber(async (_req, { userId }, { params }) => {
  const { id } = await params;

  const barber = await prisma.barber.findUnique({ where: { userId } });
  if (!barber) throw AppError.notFound("Barbero no encontrado");

  // Verify block belongs to this barber
  const block = await prisma.blockTime.findFirst({
    where: { id, barberId: barber.id },
  });
  if (!block) throw AppError.notFound("Bloqueo no encontrado");

  await prisma.blockTime.delete({ where: { id } });

  return NextResponse.json({ ok: true });
});
