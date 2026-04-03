import { NextResponse } from "next/server";
import { withPublic } from "@/lib/api-handler";
import {
  getPublicBranchInfo,
  getPublicBarbers,
  getPublicServices,
} from "@/lib/services/public.service";
import { getOrgIdFromHeaders } from "@/lib/tenant";

export const GET = withPublic(async (req) => {
  const orgId = await getOrgIdFromHeaders(req);

  const [branch, barbers, services] = await Promise.all([
    getPublicBranchInfo(orgId),
    getPublicBarbers(orgId),
    getPublicServices(orgId),
  ]);

  return NextResponse.json({ branch, barbers, services });
});
