import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { getBranches } from "@/lib/services/branch.service";

export const GET = withAdmin(async (_req, { orgId }) => {
  const branches = await getBranches(orgId);

  return NextResponse.json({
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
    })),
  });
});
