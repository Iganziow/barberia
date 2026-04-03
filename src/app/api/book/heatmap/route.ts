import { NextResponse } from "next/server";
import { withPublic } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { getOrgIdFromHeaders } from "@/lib/tenant";
import { getAvailabilityHeatmap } from "@/lib/services/availability.service";
import { prisma } from "@/lib/prisma";

export const GET = withPublic(async (req) => {
  const orgId = await getOrgIdFromHeaders(req);
  const { searchParams } = new URL(req.url);

  const branchId = searchParams.get("branchId");
  const serviceId = searchParams.get("serviceId");
  const days = Math.min(Number(searchParams.get("days")) || 14, 30);

  if (!branchId || !serviceId) {
    throw AppError.badRequest("branchId y serviceId requeridos");
  }

  // Verify branch belongs to org
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, orgId },
    select: { id: true },
  });
  if (!branch) {
    throw AppError.notFound("Sucursal no encontrada");
  }

  const heatmap = await getAvailabilityHeatmap(branchId, serviceId, days);

  return NextResponse.json({ heatmap });
});
