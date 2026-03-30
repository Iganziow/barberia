import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getTodayStats } from "@/lib/services/stats.service";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
    const stats = await getTodayStats(orgId);
    return NextResponse.json(stats);
  } catch (err) {
    console.error("GET /api/admin/stats failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
