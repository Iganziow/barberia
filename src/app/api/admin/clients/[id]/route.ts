import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getClientDetail } from "@/lib/services/client.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
    const { id } = await params;
    const client = await getClientDetail(id, orgId);

    if (!client) {
      return NextResponse.json(
        { message: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.user.name,
        email: client.user.email,
        phone: client.user.phone,
        notes: client.notes,
        loyaltyPoints: client.loyaltyPoints,
        createdAt: client.createdAt.toISOString(),
        stats: client.stats,
        appointments: client.appointments.map((a) => ({
          id: a.id,
          start: a.start.toISOString(),
          end: a.end.toISOString(),
          status: a.status,
          serviceName: a.service.name,
          barberName: a.barber.user.name,
          price: a.price,
          payment: a.payment,
        })),
      },
    });
  } catch (err) {
    console.error("GET /api/admin/clients/[id] failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
