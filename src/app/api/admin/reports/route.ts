import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import {
  getDashboardStats,
  getBarberStats,
  getServiceStats,
  getDailyRevenue,
  getCommissionReport,
} from "@/lib/services/report.service";

export const GET = withAdmin(async (req, { orgId }) => {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "month";
  const branchId = searchParams.get("branchId") || undefined;
  const type = searchParams.get("type");

  if (type === "commissions") {
    const commissions = await getCommissionReport(period, orgId, branchId);
    return NextResponse.json({ commissions });
  }

  const [dashboard, barbers, services, dailyRevenue] = await Promise.all([
    getDashboardStats(period, orgId, branchId),
    getBarberStats(period, orgId, branchId),
    getServiceStats(period, orgId, branchId),
    getDailyRevenue(period, orgId, branchId),
  ]);

  return NextResponse.json({ dashboard, barbers, services, dailyRevenue });
});
