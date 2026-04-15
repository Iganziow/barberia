import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { listByBranch } from "@/lib/services/barber-schedule.service";

export const GET = withAdmin(async (req, { orgId }) => {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");

  if (!branchId) throw AppError.badRequest("branchId requerido");

  const schedules = await listByBranch(orgId, branchId);
  return NextResponse.json({ schedules });
});
