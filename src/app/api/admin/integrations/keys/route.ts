import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api-key-auth";
import { stripHtml } from "@/lib/sanitize";
import { recordAudit } from "@/lib/audit-log";

export const GET = withAdmin(async (_req, { orgId }) => {
  const keys = await prisma.apiKey.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      active: k.active,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    })),
  });
});

export const POST = withAdmin(async (req, { orgId, userId, userEmail, userRole }) => {
  const body = await req.json().catch(() => null);
  const name = body?.name;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    throw AppError.badRequest("Nombre requerido (mínimo 2 caracteres)");
  }

  const { key, keyHash, prefix } = generateApiKey();

  const created = await prisma.apiKey.create({
    data: {
      name: stripHtml(name.trim()),
      keyHash,
      prefix,
      orgId,
    },
  });

  // Crear API key es muy sensible — log para forense ("¿quién creó la
  // key que después se usó para X?"). NO logueamos la key plain (solo
  // el prefix público).
  await recordAudit(req, { userId, userEmail, userRole, orgId }, {
    action: "apikey.create",
    resource: "ApiKey",
    resourceId: created.id,
    metadata: { name: created.name, prefix },
  });

  // Return the full key ONLY this one time
  return NextResponse.json({
    key,
    prefix,
    message: "Guarda esta API key — no se volverá a mostrar.",
  }, { status: 201 });
});
