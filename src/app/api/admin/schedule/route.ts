import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { invalidateAvailability } from "@/lib/cache/availability-cache";
import { UpdateBranchHoursSchema } from "@/lib/validations/schedule";

export const GET = withAdmin(async (req, { orgId }) => {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");

  if (!branchId) {
    // Return first branch of the org with its working hours
    const branches = await prisma.branch.findMany({
      where: { orgId },
      include: { workingHours: { orderBy: { dayOfWeek: "asc" } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ branches });
  }

  // Verify branch belongs to org
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, orgId },
    include: { workingHours: { orderBy: { dayOfWeek: "asc" } } },
  });

  if (!branch) throw AppError.notFound("Sucursal no encontrada");

  return NextResponse.json({ branch });
});

export const PUT = withAdmin(async (req, { orgId }) => {
  const body = await req.json().catch(() => null);
  if (!body) throw AppError.badRequest("JSON inválido");

  const parsed = UpdateBranchHoursSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Datos inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }

  const { branchId, hours } = parsed.data;

  // Verify branch belongs to org
  const branch = await prisma.branch.findFirst({ where: { id: branchId, orgId } });
  if (!branch) throw AppError.notFound("Sucursal no encontrada");

  // Upsert all 7 days
  await Promise.all(
    hours.map((h) =>
      prisma.workingHours.upsert({
        where: { branchId_dayOfWeek: { branchId, dayOfWeek: h.dayOfWeek } },
        update: { openTime: h.openTime, closeTime: h.closeTime, isOpen: h.isOpen },
        create: { branchId, dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isOpen: h.isOpen },
      })
    )
  );

  // Cambian las horas de la sucursal → cambia el cómputo de slots disponibles
  // para todos los barberos de esa sucursal. Invalidamos por sucursal.
  invalidateAvailability({ branchId });

  return NextResponse.json({ ok: true });
});
