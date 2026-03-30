import { NextResponse } from "next/server";
import { requireBarber } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  reason: z.string().min(1),
  start: z.string().datetime(),
  end: z.string().datetime(),
  allDay: z.boolean().optional().default(false),
});

export async function GET(req: Request) {
  const auth = await requireBarber();
  if (!auth.ok) return auth.response;

  try {
    const userId = auth.payload.sub;
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
  } catch (err) {
    console.error("GET /api/barber/block-times failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireBarber();
  if (!auth.ok) return auth.response;

  try {
    const userId = auth.payload.sub;
    const barber = await prisma.barber.findUnique({ where: { userId } });
    if (!barber) return NextResponse.json({ message: "Barbero no encontrado" }, { status: 404 });

    const json = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Datos inválidos" }, { status: 400 });
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
  } catch (err) {
    console.error("POST /api/barber/block-times failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
