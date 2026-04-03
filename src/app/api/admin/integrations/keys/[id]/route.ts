import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const DELETE = withAdmin(async (_req, { orgId }, { params }) => {
  const { id } = await params;

  const key = await prisma.apiKey.findFirst({
    where: { id, orgId },
  });
  if (!key) throw AppError.notFound("API key no encontrada");

  await prisma.apiKey.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ ok: true });
});
