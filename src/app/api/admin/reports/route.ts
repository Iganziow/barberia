import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import {
  getDashboardStats,
  getBarberStats,
  getServiceStats,
  getDailyRevenue,
  getCommissionReport,
} from "@/lib/services/report.service";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
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

    return NextResponse.json({
      dashboard,
      barbers,
      services,
      dailyRevenue,
    });
  } catch (err) {
    console.error("GET /api/admin/reports failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
