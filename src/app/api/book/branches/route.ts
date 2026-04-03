import { NextResponse } from "next/server";
import { withPublic } from "@/lib/api-handler";
import { getBranches } from "@/lib/services/branch.service";
import { getOrgIdFromHeaders } from "@/lib/tenant";

export const GET = withPublic(async (req) => {
  const orgId = await getOrgIdFromHeaders(req);
  const branches = await getBranches(orgId);

  return NextResponse.json({
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
    })),
  });
});
