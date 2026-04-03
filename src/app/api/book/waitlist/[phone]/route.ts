import { NextResponse } from "next/server";
import { withPublic } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { getWaitlistByPhone } from "@/lib/services/waitlist.service";

export const GET = withPublic(async (_req, { params }) => {
  const { phone } = await params;

  if (!phone || phone.length < 8) {
    throw AppError.badRequest("Teléfono inválido");
  }

  const entries = await getWaitlistByPhone(phone);

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      serviceName: e.service.name,
      barberName: e.barber?.user.name ?? "Cualquier barbero",
      branchName: e.branch.name,
      preferredDate: e.preferredDate,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
    })),
  });
});
