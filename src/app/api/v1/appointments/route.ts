import { NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { parseDate } from "@/lib/sanitize";

export const GET = withApiKey(async (req, { orgId }) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "DONE";
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  if (!fromStr || !toStr) {
    throw AppError.badRequest("Parámetros 'from' y 'to' requeridos (ISO 8601)");
  }

  const from = parseDate(fromStr);
  const to = parseDate(toStr);
  if (!from || !to) {
    throw AppError.badRequest("Formato de fecha inválido");
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      branch: { orgId },
      status: status as never,
      start: { gte: from, lte: to },
    },
    include: {
      service: { select: { id: true, name: true, durationMin: true, price: true } },
      barber: { include: { user: { select: { name: true } } } },
      client: { include: { user: { select: { name: true, phone: true } } } },
    },
    orderBy: { start: "asc" },
    take: 500,
  });

  return NextResponse.json({
    appointments: appointments.map((a) => ({
      id: a.id,
      start: a.start.toISOString(),
      end: a.end.toISOString(),
      status: a.status,
      price: a.price,
      service: a.service,
      barberName: a.barber.user.name,
      clientName: a.client.user.name,
      clientPhone: a.client.user.phone,
    })),
    count: appointments.length,
  });
});
