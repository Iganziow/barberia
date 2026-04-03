import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { UpdateBarberScheduleSchema } from "@/lib/validations/schedule";

export const GET = withAdmin(async (_req, { orgId }, { params }) => {
  const { id: barberId } = await params;

  const barber = await prisma.barber.findFirst({
    where: { id: barberId, branch: { orgId } },
    include: {
      user: { select: { name: true } },
      barberSchedules: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!barber) throw AppError.notFound("Barbero no encontrado");

  return NextResponse.json({ schedule: barber.barberSchedules, name: barber.user.name });
});

export const PUT = withAdmin(async (req, { orgId }, { params }) => {
  const { id: barberId } = await params;

  const barber = await prisma.barber.findFirst({ where: { id: barberId, branch: { orgId } } });
  if (!barber) throw AppError.notFound("Barbero no encontrado");

  const body = await req.json().catch(() => null);
  if (!body) throw AppError.badRequest("JSON inválido");

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
});
