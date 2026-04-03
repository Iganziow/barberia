import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { getAdminWaitlist } from "@/lib/services/waitlist.service";

export const GET = withAdmin(async (req, { orgId }) => {
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
});
