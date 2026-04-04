import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const DELETE = withAdmin(async (_req, { orgId }, { params }) => {
  const { id } = await params;

  const block = await prisma.blockTime.findFirst({
    where: { id, barber: { branch: { orgId } } },
  });
  if (!block) throw AppError.notFound("Bloqueo no encontrado");

  await prisma.blockTime.delete({ where: { id } });

  return NextResponse.json({ ok: true });
});
