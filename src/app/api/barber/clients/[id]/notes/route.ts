import { NextResponse } from "next/server";
import { withBarber } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/barber/clients/[id]/notes
 *
 * Devuelve el historial de notas internas que existen en las citas
 * previas de este cliente con este barbero (solo las suyas, no las
 * de otros barberos — scope estricto).
 *
 * Se consume desde el modal de detalle de cita del barbero: cuando
 * atiende a un cliente, puede leer "¿qué le corté la última vez?"
 * sin tener que preguntarle.
 */
export const GET = withBarber(async (_req, { userId }, { params }) => {
  const { id: clientId } = await params;

  const barber = await prisma.barber.findUnique({ where: { userId } });
  if (!barber) throw AppError.notFound("Barbero no encontrado");

  // Verifica que el cliente exista y tenga historial con este barbero
  // (evita fishing de IDs de otros barberos)
  const hasAny = await prisma.appointment.findFirst({
    where: { clientId, barberId: barber.id },
    select: { id: true },
  });
  if (!hasAny) {
    // Devolvemos vacío en vez de 404 para UX más suave en el modal
    return NextResponse.json({ notes: [] });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      clientId,
      barberId: barber.id,
      noteInternal: { not: null },
    },
    select: {
      id: true,
      start: true,
      status: true,
      noteInternal: true,
      service: { select: { name: true } },
    },
    orderBy: { start: "desc" },
    take: 20, // cota razonable — rara vez necesitas más de 20 notas para contexto
  });

  return NextResponse.json({
    notes: appointments
      .filter((a) => a.noteInternal && a.noteInternal.trim())
      .map((a) => ({
        id: a.id,
        date: a.start.toISOString(),
        status: a.status,
        serviceName: a.service.name,
        note: a.noteInternal,
      })),
  });
});
