import { NextResponse } from "next/server";
import { withBarber } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/barber/clients/search?q=...
 *
 * Busca clientes que hayan tenido al menos una cita con ESTE barbero.
 * Se usa desde el quick-search (Ctrl+K) del panel del barbero para que
 * pueda revisar el historial de notas de un cliente sin tener que abrir
 * una cita específica.
 */
export const GET = withBarber(async (req, { userId }) => {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) return NextResponse.json({ clients: [] });

  const barber = await prisma.barber.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!barber) throw AppError.notFound("Barbero no encontrado");

  // Solo clientes que ya vinieron con este barbero — protege contra
  // fishing de clientes de otros colegas del mismo negocio.
  const clients = await prisma.client.findMany({
    where: {
      appointments: { some: { barberId: barber.id } },
      user: {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q } },
        ],
      },
    },
    select: {
      id: true,
      user: { select: { name: true, phone: true, email: true } },
      _count: {
        select: {
          appointments: { where: { barberId: barber.id } },
        },
      },
    },
    orderBy: { user: { name: "asc" } },
    take: 10,
  });

  return NextResponse.json({
    clients: clients.map((c) => ({
      id: c.id,
      name: c.user.name,
      phone: c.user.phone,
      email: c.user.email,
      visits: c._count.appointments,
    })),
  });
});
