import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getBarbers } from "@/lib/services/barber.service";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId") || undefined;

    const barbers = await getBarbers(orgId, branchId);

    return NextResponse.json({
      barbers: barbers.map((b) => ({
        id: b.id,
        name: b.user.name,
        color: b.color,
        commissionType: b.commissionType,
        commissionValue: b.commissionValue,
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/barbers failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
