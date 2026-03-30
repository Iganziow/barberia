import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { UpdateBarberScheduleSchema } from "@/lib/validations/schedule";

// GET /api/admin/barbers/[id]/schedule
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
    const { id: barberId } = await params;

    // Verify barber belongs to org
    const barber = await prisma.barber.findFirst({
      where: { id: barberId, branch: { orgId } },
      include: {
        user: { select: { name: true } },
        barberSchedules: { orderBy: { dayOfWeek: "asc" } },
      },
    });

    if (!barber) return NextResponse.json({ message: "Barbero no encontrado" }, { status: 404 });

    return NextResponse.json({ schedule: barber.barberSchedules, name: barber.user.name });
  } catch (err) {
    console.error("GET /api/admin/barbers/[id]/schedule failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

// PUT /api/admin/barbers/[id]/schedule
// Body: { schedule: [{dayOfWeek, startTime, endTime, isWorking}] }
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
    const { id: barberId } = await params;

    // Verify barber belongs to org
    const barber = await prisma.barber.findFirst({ where: { id: barberId, branch: { orgId } } });
    if (!barber) return NextResponse.json({ message: "Barbero no encontrado" }, { status: 404 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ message: "JSON inválido" }, { status: 400 });

    const parsed = UpdateBarberScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Datos inválidos", errors: parsed.error.flatten() }, { status: 400 });
    }

    const { schedule } = parsed.data;

    await Promise.all(
      schedule.map((s) =>
        prisma.barberSchedule.upsert({
          where: { barberId_dayOfWeek: { barberId, dayOfWeek: s.dayOfWeek } },
          update: { startTime: s.startTime, endTime: s.endTime, isWorking: s.isWorking },
          create: { barberId, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, isWorking: s.isWorking },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/admin/barbers/[id]/schedule failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
