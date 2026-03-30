import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { CommissionType } from "@prisma/client";

// PATCH /api/admin/barbers/[id]
// Body: { commissionType, commissionValue }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
    const { id: barberId } = await params;

    // Verify barber belongs to org
    const barber = await prisma.barber.findFirst({ where: { id: barberId, branch: { orgId } } });
    if (!barber) return NextResponse.json({ message: "Barbero no encontrado" }, { status: 404 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ message: "JSON inválido" }, { status: 400 });

    const { commissionType, commissionValue } = body as {
      commissionType: CommissionType;
      commissionValue: number;
    };

    if (!["PERCENTAGE", "FIXED"].includes(commissionType) || typeof commissionValue !== "number" || commissionValue < 0) {
      return NextResponse.json({ message: "Datos inválidos" }, { status: 400 });
    }
    if (commissionType === "PERCENTAGE" && commissionValue > 100) {
      return NextResponse.json({ message: "El porcentaje no puede ser mayor a 100" }, { status: 400 });
    }

    const updated = await prisma.barber.update({
      where: { id: barberId },
      data: { commissionType, commissionValue },
    });

    return NextResponse.json({ ok: true, commissionType: updated.commissionType, commissionValue: updated.commissionValue });
  } catch (err) {
    console.error("PATCH /api/admin/barbers/[id] failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
