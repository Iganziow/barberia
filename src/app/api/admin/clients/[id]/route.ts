import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { getClientDetail } from "@/lib/services/client.service";

export const GET = withAdmin(async (_req, { orgId }, { params }) => {
  const { id } = await params;
  const client = await getClientDetail(id, orgId);

  if (!client) {
    throw AppError.notFound("Cliente no encontrado");
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
});
