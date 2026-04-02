import { NextResponse } from "next/server";
import { withBarber } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const GET = withBarber(async (_req, { userId }) => {
  const barber = await prisma.barber.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      branch: { select: { id: true, name: true } },
    },
  });

  if (!barber) throw AppError.notFound("Barbero no encontrado");

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const todayAppointments = await prisma.appointment.findMany({
    where: {
      barberId: barber.id,
      start: { gte: startOfDay, lt: endOfDay },
      status: { not: "CANCELED" },
    },
    select: { status: true, price: true },
  });

  // Single pass to compute all stats
  const stats = todayAppointments.reduce(
    (acc, a) => {
      acc.totalToday++;
      if (a.status === "DONE") { acc.doneToday++; acc.revenueToday += a.price; }
      if (a.status === "RESERVED") acc.pendingToday++;
      return acc;
    },
    { totalToday: 0, doneToday: 0, revenueToday: 0, pendingToday: 0 }
  );

  return NextResponse.json({
    barber: {
      id: barber.id,
      name: barber.user.name,
      email: barber.user.email,
      phone: barber.user.phone,
      color: barber.color,
      branch: barber.branch,
    },
    stats,
  });
});
