import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { updateWaitlistStatus } from "@/lib/services/waitlist.service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);

    if (!body?.status || !["NOTIFIED", "BOOKED", "EXPIRED"].includes(body.status)) {
      return NextResponse.json({ message: "Estado inválido" }, { status: 400 });
    }

    const updated = await updateWaitlistStatus(id, body.status);
    return NextResponse.json({ entry: updated });
  } catch (err) {
    console.error("PATCH /api/admin/waitlist/[id] failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
