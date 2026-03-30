import { prisma } from "@/lib/prisma";

export async function getTodayStats(orgId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const orgFilter = { branch: { orgId } };

  const [count, nextApt, revenue] = await Promise.all([
    prisma.appointment.count({
      where: {
        ...orgFilter,
        start: { gte: todayStart, lte: todayEnd },
        status: { notIn: ["CANCELED", "NO_SHOW"] },
      },
    }),
    prisma.appointment.findFirst({
      where: {
        ...orgFilter,
        start: { gte: now, lte: todayEnd },
        status: { notIn: ["CANCELED", "NO_SHOW", "DONE"] },
      },
      orderBy: { start: "asc" },
      select: { start: true },
    }),
    prisma.payment.aggregate({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
        appointment: orgFilter,
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    appointmentCount: count,
    nextAppointmentTime: nextApt?.start?.toISOString() ?? null,
    todayRevenue: revenue._sum.amount ?? 0,
  };
}
