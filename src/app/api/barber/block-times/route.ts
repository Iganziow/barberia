import { NextResponse } from "next/server";
import { withBarber } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { invalidateAvailability } from "@/lib/cache/availability-cache";

const CreateSchema = z.object({
  reason: z.string().min(1),
  start: z.string().datetime(),
  end: z.string().datetime(),
  allDay: z.boolean().optional().default(false),
});

export const GET = withBarber(async (req, { userId }) => {
  const barber = await prisma.barber.findUnique({ where: { userId } });
  if (!barber) return NextResponse.json({ blockTimes: [] });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const blocks = await prisma.blockTime.findMany({
    where: {
      barberId: barber.id,
      ...(from || to
        ? {
            start: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { start: "asc" },
  });

  return NextResponse.json({
    blockTimes: blocks.map((b) => ({
      id: b.id,
      reason: b.reason,
      start: b.start.toISOString(),
      end: b.end.toISOString(),
      allDay: b.allDay,
    })),
  });
});

export const POST = withBarber(async (req, { userId }) => {
  // Traemos branchId para invalidar caché por sucursal tras crear bloqueo.
  const barber = await prisma.barber.findUnique({
    where: { userId },
    select: { id: true, branchId: true },
  });
  if (!barber) throw AppError.notFound("Barbero no encontrado");

  const json = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    throw AppError.badRequest("Datos inválidos");
  }

  const block = await prisma.blockTime.create({
    data: {
      reason: parsed.data.reason,
      start: new Date(parsed.data.start),
      end: new Date(parsed.data.end),
      allDay: parsed.data.allDay,
      barberId: barber.id,
    },
  });

  // Nuevo bloqueo del barbero = slots ocupados.
  invalidateAvailability({ barberId: barber.id, branchId: barber.branchId });

  return NextResponse.json(
    {
      blockTime: {
        id: block.id,
        reason: block.reason,
        start: block.start.toISOString(),
        end: block.end.toISOString(),
        allDay: block.allDay,
      },
    },
    { status: 201 }
  );
});
