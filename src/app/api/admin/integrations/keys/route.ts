import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api-key-auth";
import { stripHtml } from "@/lib/sanitize";

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

export const POST = withAdmin(async (req, { orgId }) => {
  const body = await req.json().catch(() => null);
  const name = body?.name;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    throw AppError.badRequest("Nombre requerido (mínimo 2 caracteres)");
  }

  const { key, keyHash, prefix } = generateApiKey();

  await prisma.apiKey.create({
    data: {
      name: stripHtml(name.trim()),
      keyHash,
      prefix,
      orgId,
    },
  });

  // Return the full key ONLY this one time
  return NextResponse.json({
    key,
    prefix,
    message: "Guarda esta API key — no se volverá a mostrar.",
  }, { status: 201 });
});
