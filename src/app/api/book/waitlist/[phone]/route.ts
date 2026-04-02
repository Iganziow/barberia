import { NextResponse } from "next/server";
import { getWaitlistByPhone } from "@/lib/services/waitlist.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;

    if (!phone || phone.length < 8) {
      return NextResponse.json({ message: "Teléfono inválido" }, { status: 400 });
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
  } catch (err) {
    console.error("GET /api/book/waitlist/[phone] failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
