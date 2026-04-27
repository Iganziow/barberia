import { NextResponse } from "next/server";
import { withPublic } from "@/lib/api-handler";
import { getBranches } from "@/lib/services/branch.service";
import { getOrgIdFromHeaders } from "@/lib/tenant";

/**
 * Devuelve todas las sucursales del negocio. La UI las usa para el
 * selector cuando hay 2+ (si hay 1 sola, se selecciona automáticamente).
 */
export const GET = withPublic(async (req) => {
  const orgId = await getOrgIdFromHeaders(req);
  const branches = await getBranches(orgId);

  return NextResponse.json({
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
    })),
  });
});
