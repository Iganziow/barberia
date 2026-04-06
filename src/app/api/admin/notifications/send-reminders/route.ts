import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { sendReminders } from "@/lib/services/email.service";

export const POST = withAdmin(async (_req, { orgId }) => {
  const sent = await sendReminders(orgId);
  return NextResponse.json({
    sent,
    message: sent > 0
      ? `${sent} recordatorio${sent !== 1 ? "s" : ""} enviado${sent !== 1 ? "s" : ""}`
      : "No hay citas de mañana pendientes de recordatorio",
  });
});
