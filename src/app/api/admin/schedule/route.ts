import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { UpdateBranchHoursSchema } from "@/lib/validations/schedule";

// GET /api/admin/schedule?branchId=X
// Returns working hours for a branch (all 7 days)
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
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

    if (!branch) return NextResponse.json({ message: "Sucursal no encontrada" }, { status: 404 });

    return NextResponse.json({ branch });
  } catch (err) {
    console.error("GET /api/admin/schedule failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

// PUT /api/admin/schedule
// Body: { branchId, hours: [{dayOfWeek, openTime, closeTime, isOpen}] }
export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ message: "JSON inválido" }, { status: 400 });

    const parsed = UpdateBranchHoursSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Datos inválidos", errors: parsed.error.flatten() }, { status: 400 });
    }

    const { branchId, hours } = parsed.data;

    // Verify branch belongs to org
    const branch = await prisma.branch.findFirst({ where: { id: branchId, orgId } });
    if (!branch) return NextResponse.json({ message: "Sucursal no encontrada" }, { status: 404 });

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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/admin/schedule failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
