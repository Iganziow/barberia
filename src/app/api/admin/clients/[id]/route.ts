import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { getClientDetail, updateClient } from "@/lib/services/client.service";
import { stripHtml } from "@/lib/sanitize";

const UpdateClientSchema = z.object({
  name: z.string().min(1).transform(stripHtml).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().transform(stripHtml).nullable().optional(),
  notes: z.string().transform(stripHtml).nullable().optional(),
});

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
        noteInternal: a.noteInternal,
      })),
    },
  });
});

export const PUT = withAdmin(async (req, { orgId }, { params }) => {
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = UpdateClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await updateClient(id, orgId, parsed.data);
  if (!updated) throw AppError.notFound("Cliente no encontrado");

  return NextResponse.json({
    client: {
      id: updated.id,
      name: updated.user.name,
      email: updated.user.email,
      phone: updated.user.phone,
      notes: updated.notes,
    },
  });
});
