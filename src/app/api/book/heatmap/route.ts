import { NextResponse } from "next/server";
import { getOrgIdFromHeaders } from "@/lib/tenant";
import { getAvailabilityHeatmap } from "@/lib/services/availability.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const orgId = await getOrgIdFromHeaders(req);
    const { searchParams } = new URL(req.url);

    const branchId = searchParams.get("branchId");
    const serviceId = searchParams.get("serviceId");
    const days = Math.min(Number(searchParams.get("days")) || 14, 30);

    if (!branchId || !serviceId) {
      return NextResponse.json({ message: "branchId y serviceId requeridos" }, { status: 400 });
    }

    // Verify branch belongs to org
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, orgId },
      select: { id: true },
    });
    if (!branch) {
      return NextResponse.json({ message: "Sucursal no encontrada" }, { status: 404 });
    }

    const heatmap = await getAvailabilityHeatmap(branchId, serviceId, days);

    return NextResponse.json({ heatmap });
  } catch (err) {
    console.error("GET /api/book/heatmap failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
