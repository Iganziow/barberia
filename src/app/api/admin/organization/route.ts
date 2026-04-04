import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/sanitize";

const ORG_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  phone: true,
  email: true,
  logo: true,
  timezone: true,
  currency: true,
} as const;

export const GET = withAdmin(async (_req, { orgId }) => {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: ORG_SELECT,
  });

  if (!org) throw AppError.notFound("Organización no encontrada");

  // Get main branch for address/coords
  const branch = await prisma.branch.findFirst({
    where: { orgId },
    select: { id: true, name: true, address: true, latitude: true, longitude: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ organization: org, branch });
});

export const PATCH = withAdmin(async (req, { orgId }) => {
  const body = await req.json().catch(() => null);
  if (!body) throw AppError.badRequest("JSON inválido");

  const orgUpdates: Record<string, unknown> = {};
  const branchUpdates: Record<string, unknown> = {};

  // Organization fields
  if (body.name !== undefined) {
    const name = stripHtml(String(body.name)).trim();
    if (name.length < 2) throw AppError.badRequest("Nombre debe tener al menos 2 caracteres");
    orgUpdates.name = name;
  }

  if (body.slug !== undefined) {
    const slug = String(body.slug).toLowerCase().trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (slug.length < 3) throw AppError.badRequest("El slug debe tener al menos 3 caracteres");
    if (slug.length > 50) throw AppError.badRequest("El slug no puede tener más de 50 caracteres");

    const existing = await prisma.organization.findFirst({
      where: { slug, id: { not: orgId } },
    });
    if (existing) throw AppError.conflict("Este slug ya está en uso por otra organización");

    orgUpdates.slug = slug;
  }

  if (body.description !== undefined) {
    orgUpdates.description = body.description ? stripHtml(String(body.description)).trim().slice(0, 500) : null;
  }

  if (body.phone !== undefined) {
    orgUpdates.phone = body.phone ? stripHtml(String(body.phone)).trim() : null;
  }

  if (body.email !== undefined) {
    orgUpdates.email = body.email ? stripHtml(String(body.email)).trim() : null;
  }

  if (body.logo !== undefined) {
    orgUpdates.logo = body.logo ? String(body.logo).trim().slice(0, 500) : null;
  }

  // Branch location fields
  if (body.address !== undefined) {
    branchUpdates.address = body.address ? stripHtml(String(body.address)).trim() : null;
  }

  if (body.latitude !== undefined && body.longitude !== undefined) {
    const lat = Number(body.latitude);
    const lng = Number(body.longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      branchUpdates.latitude = lat;
      branchUpdates.longitude = lng;
    }
  }

  if (Object.keys(orgUpdates).length === 0 && Object.keys(branchUpdates).length === 0) {
    throw AppError.badRequest("No hay campos para actualizar");
  }

  // Update org
  let org;
  if (Object.keys(orgUpdates).length > 0) {
    org = await prisma.organization.update({
      where: { id: orgId },
      data: orgUpdates,
      select: ORG_SELECT,
    });
  } else {
    org = await prisma.organization.findUnique({ where: { id: orgId }, select: ORG_SELECT });
  }

  // Update branch location
  let branch = null;
  if (Object.keys(branchUpdates).length > 0) {
    const mainBranch = await prisma.branch.findFirst({ where: { orgId }, orderBy: { createdAt: "asc" } });
    if (mainBranch) {
      branch = await prisma.branch.update({
        where: { id: mainBranch.id },
        data: branchUpdates,
        select: { id: true, name: true, address: true, latitude: true, longitude: true },
      });
    }
  } else {
    branch = await prisma.branch.findFirst({
      where: { orgId },
      select: { id: true, name: true, address: true, latitude: true, longitude: true },
      orderBy: { createdAt: "asc" },
    });
  }

  return NextResponse.json({ organization: org, branch });
});
