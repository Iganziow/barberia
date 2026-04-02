import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { getTodayStats } from "@/lib/services/stats.service";

export const GET = withAdmin(async (_req, { orgId }) => {
  const stats = await getTodayStats(orgId);
  return NextResponse.json(stats);
});
