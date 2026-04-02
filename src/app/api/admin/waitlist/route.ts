import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getAdminWaitlist } from "@/lib/services/waitlist.service";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;
    const branchId = searchParams.get("branchId") || undefined;

    const entries = await getAdminWaitlist(orgId, { date, branchId });

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        clientName: e.clientName,
        clientPhone: e.clientPhone,
        serviceName: e.service.name,
        servicePrice: e.service.price,
        barberName: e.barber?.user.name ?? null,
        preferredDate: e.preferredDate,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/waitlist failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
