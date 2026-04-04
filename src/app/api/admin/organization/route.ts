import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/sanitize";

export const GET = withAdmin(async (_req, { orgId }) => {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      email: true,
      logo: true,
      timezone: true,
      currency: true,
    },
  });

  if (!org) throw AppError.notFound("Organización no encontrada");

  return NextResponse.json({ organization: org });
});

export const PATCH = withAdmin(async (req, { orgId }) => {
  const body = await req.json().catch(() => null);
  if (!body) throw AppError.badRequest("JSON inválido");

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = stripHtml(String(body.name)).trim();
    if (name.length < 2) throw AppError.badRequest("Nombre debe tener al menos 2 caracteres");
    updates.name = name;
  }

  if (body.slug !== undefined) {
    const slug = String(body.slug).toLowerCase().trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (slug.length < 3) throw AppError.badRequest("El slug debe tener al menos 3 caracteres");
    if (slug.length > 50) throw AppError.badRequest("El slug no puede tener más de 50 caracteres");

    // Check slug is unique (except current org)
    const existing = await prisma.organization.findFirst({
      where: { slug, id: { not: orgId } },
    });
    if (existing) throw AppError.conflict("Este slug ya está en uso por otra organización");

    updates.slug = slug;
  }

  if (body.phone !== undefined) {
    updates.phone = body.phone ? stripHtml(String(body.phone)).trim() : null;
  }

  if (body.email !== undefined) {
    updates.email = body.email ? stripHtml(String(body.email)).trim() : null;
  }

  if (Object.keys(updates).length === 0) {
    throw AppError.badRequest("No hay campos para actualizar");
  }

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: updates,
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      email: true,
      logo: true,
      timezone: true,
      currency: true,
    },
  });

  return NextResponse.json({ organization: org });
});
