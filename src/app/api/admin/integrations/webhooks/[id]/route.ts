import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const DELETE = withAdmin(async (_req, { orgId }, { params }) => {
  const { id } = await params;

  const webhook = await prisma.integrationWebhook.findFirst({
    where: { id, orgId },
  });
  if (!webhook) throw AppError.notFound("Webhook no encontrado");

  await prisma.integrationWebhook.delete({ where: { id } });

  return NextResponse.json({ ok: true });
});
