import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { getBarbers } from "@/lib/services/barber.service";

export const GET = withAdmin(async (req, { orgId }) => {
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
});
