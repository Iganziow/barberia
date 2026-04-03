import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { updateWaitlistStatus } from "@/lib/services/waitlist.service";

export const PATCH = withAdmin(async (req, _ctx, { params }) => {
  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body?.status || !["NOTIFIED", "BOOKED", "EXPIRED"].includes(body.status)) {
    throw AppError.badRequest("Estado inválido");
  }

  const updated = await updateWaitlistStatus(id, body.status);
  return NextResponse.json({ entry: updated });
});
