import { NextResponse } from "next/server";
import { withPublic } from "@/lib/api-handler";
import { getServices } from "@/lib/services/service.service";
import { getOrgIdFromHeaders } from "@/lib/tenant";

export const GET = withPublic(async (req) => {
  const orgId = await getOrgIdFromHeaders(req);
  const services = await getServices(orgId);

  return NextResponse.json({
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      durationMin: s.durationMin,
      price: s.price,
      category: s.category?.name ?? null,
    })),
  });
});
