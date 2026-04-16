import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/appointments/search?q=juan
 * Búsqueda global de citas por nombre, teléfono o email del cliente.
 * Devuelve hasta 15 resultados ordenados por fecha de inicio descendente
 * (más recientes primero).
 */
export const GET = withAdmin(async (req, { orgId }) => {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      branch: { orgId },
      OR: [
        { client: { user: { name: { contains: q, mode: "insensitive" } } } },
        { client: { user: { phone: { contains: q } } } },
        { client: { user: { email: { contains: q, mode: "insensitive" } } } },
      ],
    },
    include: {
      barber: { include: { user: { select: { name: true } } } },
      service: { select: { name: true } },
      client: { include: { user: { select: { name: true, phone: true } } } },
    },
    orderBy: { start: "desc" },
    take: 15,
  });

  return NextResponse.json({
    results: appointments.map((a) => ({
      id: a.id,
      start: a.start.toISOString(),
      end: a.end.toISOString(),
      status: a.status,
      clientName: a.client.user.name,
      clientPhone: a.client.user.phone,
      serviceName: a.service.name,
      barberId: a.barberId,
      barberName: a.barber.user.name,
    })),
  });
});
