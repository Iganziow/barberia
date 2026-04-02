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

  // Today's stats
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

  const totalToday = todayAppointments.length;
  const doneToday = todayAppointments.filter((a) => a.status === "DONE").length;
  const revenueToday = todayAppointments
    .filter((a) => a.status === "DONE")
    .reduce((sum, a) => sum + a.price, 0);
  const pendingToday = todayAppointments.filter((a) => a.status === "RESERVED").length;

  return NextResponse.json({
    barber: {
      id: barber.id,
      name: barber.user.name,
      email: barber.user.email,
      phone: barber.user.phone,
      color: barber.color,
      branch: barber.branch,
    },
    stats: { totalToday, doneToday, pendingToday, revenueToday },
  });
});
