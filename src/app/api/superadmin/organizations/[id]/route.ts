import { NextResponse } from "next/server";
import { withSuperAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const GET = withSuperAdmin(async (_req, _ctx, { params }) => {
  const { id } = await params;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      branches: {
        include: {
          barbers: { include: { user: { select: { name: true, email: true } } } },
          _count: { select: { appointments: true } },
        },
      },
      services: { select: { id: true, name: true, price: true, active: true } },
      users: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
    },
  });

  if (!org) throw AppError.notFound("Organización no encontrada");

  return NextResponse.json({ organization: org });
});
