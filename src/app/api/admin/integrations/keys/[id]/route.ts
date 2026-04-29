import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit-log";

export const DELETE = withAdmin(async (req, { orgId, userId, userEmail, userRole }, { params }) => {
  const { id } = await params;

  const key = await prisma.apiKey.findFirst({
    where: { id, orgId },
  });
  if (!key) throw AppError.notFound("API key no encontrada");

  await prisma.apiKey.update({
    where: { id },
    data: { active: false },
  });

  await recordAudit(req, { userId, userEmail, userRole, orgId }, {
    action: "apikey.revoke",
    resource: "ApiKey",
    resourceId: id,
    metadata: { name: key.name, prefix: key.prefix },
  });

  return NextResponse.json({ ok: true });
});
