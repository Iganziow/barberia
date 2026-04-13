import { NextResponse } from "next/server";
import { withSuperAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/sanitize";
import bcrypt from "bcryptjs";

export const GET = withSuperAdmin(async () => {
  const orgs = await prisma.organization.findMany({
    include: {
      _count: { select: { branches: true, services: true, users: true } },
      branches: {
        select: { _count: { select: { barbers: true, appointments: true } } },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    organizations: orgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      email: o.email,
      phone: o.phone,
      createdAt: o.createdAt.toISOString(),
      branches: o._count.branches,
      services: o._count.services,
      users: o._count.users,
      barbers: o.branches[0]?._count.barbers ?? 0,
      appointments: o.branches[0]?._count.appointments ?? 0,
    })),
  });
});

export const POST = withSuperAdmin(async (req) => {
  const body = await req.json().catch(() => null);
  if (!body) throw AppError.badRequest("JSON inválido");

  const { orgName, orgSlug, adminName, adminEmail, adminPassword, branchName, branchAddress } = body;

  if (!orgName || !orgSlug || !adminEmail || !adminPassword) {
    throw AppError.badRequest("orgName, orgSlug, adminEmail y adminPassword son requeridos");
  }

  const slug = stripHtml(String(orgSlug)).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (slug.length < 3) throw AppError.badRequest("Slug debe tener al menos 3 caracteres");

  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) throw AppError.conflict("Este slug ya está en uso");

  const existingEmail = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingEmail) throw AppError.conflict("Este email ya está registrado");

  const hash = await bcrypt.hash(adminPassword, 10);

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: stripHtml(orgName),
        slug,
        email: body.orgEmail || null,
        phone: body.orgPhone || null,
      },
    });

    const branch = await tx.branch.create({
      data: {
        name: stripHtml(branchName || "Sede Principal"),
        address: branchAddress ? stripHtml(branchAddress) : null,
        orgId: org.id,
      },
    });

    const admin = await tx.user.create({
      data: {
        name: stripHtml(adminName || "Administrador"),
        email: adminEmail,
        password: hash,
        role: "ADMIN",
        orgId: org.id,
      },
    });

    return { org, branch, admin };
  });

  return NextResponse.json({
    organization: { id: result.org.id, name: result.org.name, slug: result.org.slug },
    branch: { id: result.branch.id, name: result.branch.name },
    admin: { id: result.admin.id, email: result.admin.email },
  }, { status: 201 });
});
