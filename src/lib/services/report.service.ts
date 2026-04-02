import { prisma } from "@/lib/prisma";
import { AppointmentStatus, CommissionType } from "@prisma/client";

type DateRange = { from: Date; to: Date };

function getDateRange(period: string): DateRange {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (period) {
    case "today": {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from, to };
    }
    case "week": {
      const from = new Date(to);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { from, to: monthEnd };
    }
    case "year": {
      const from = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      return { from, to: yearEnd };
    }
    default: {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd2 = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { from, to: monthEnd2 };
    }
  }
}

export async function getDashboardStats(period: string, orgId: string, branchId?: string) {
  const { from, to } = getDateRange(period);

  const where = {
    branch: { orgId },
    start: { gte: from, lte: to },
    ...(branchId ? { branchId } : {}),
  };

  const [totalAppointments, completedAppointments, canceledAppointments, noShowAppointments, revenueResult, paidPayments] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.count({ where: { ...where, status: AppointmentStatus.DONE } }),
    prisma.appointment.count({ where: { ...where, status: AppointmentStatus.CANCELED } }),
    prisma.appointment.count({ where: { ...where, status: AppointmentStatus.NO_SHOW } }),
    prisma.appointment.aggregate({ where: { ...where, status: AppointmentStatus.DONE }, _sum: { price: true } }),
    prisma.payment.aggregate({
      where: {
        createdAt: { gte: from, lte: to },
        appointment: { branch: { orgId }, ...(branchId ? { branchId } : {}) },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const revenue = revenueResult._sum.price ?? 0;
  const paidAmount = paidPayments._sum.amount ?? 0;

  return {
    period,
    from: from.toISOString(),
    to: to.toISOString(),
    appointments: {
      total: totalAppointments,
      completed: completedAppointments,
      canceled: canceledAppointments,
      noShow: noShowAppointments,
      reserved: totalAppointments - completedAppointments - canceledAppointments - noShowAppointments,
    },
    revenue: { total: revenue, paid: paidAmount, pending: Math.max(revenue - paidAmount, 0) },
  };
}

export async function getBarberStats(period: string, orgId: string, branchId?: string) {
  const { from, to } = getDateRange(period);
  const branchFilter = branchId ? { branchId } : { branch: { orgId } };

  const [barbers, allCounts, doneCounts, revenueGroups] = await Promise.all([
    prisma.barber.findMany({
      where: { active: true, branch: { orgId }, ...(branchId ? { branchId } : {}) },
      include: { user: { select: { name: true } } },
    }),
    prisma.appointment.groupBy({
      by: ["barberId"],
      where: { ...branchFilter, start: { gte: from, lte: to } },
      _count: { id: true },
    }),
    prisma.appointment.groupBy({
      by: ["barberId"],
      where: { ...branchFilter, start: { gte: from, lte: to }, status: AppointmentStatus.DONE },
      _count: { id: true },
    }),
    prisma.appointment.groupBy({
      by: ["barberId"],
      where: { ...branchFilter, start: { gte: from, lte: to }, status: AppointmentStatus.DONE },
      _sum: { price: true },
    }),
  ]);

  const countMap = new Map(allCounts.map((c) => [c.barberId, c._count.id]));
  const doneMap = new Map(doneCounts.map((c) => [c.barberId, c._count.id]));
  const revMap = new Map(revenueGroups.map((r) => [r.barberId, r._sum.price ?? 0]));

  return barbers
    .map((b) => ({
      id: b.id,
      name: b.user.name,
      color: b.color,
      appointments: countMap.get(b.id) ?? 0,
      completed: doneMap.get(b.id) ?? 0,
      revenue: revMap.get(b.id) ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getServiceStats(period: string, orgId: string, branchId?: string) {
  const { from, to } = getDateRange(period);
  const branchFilter = branchId ? { branchId } : {};

  const [services, allCounts, revenueGroups] = await Promise.all([
    prisma.service.findMany({ where: { active: true, orgId } }),
    prisma.appointment.groupBy({
      by: ["serviceId"],
      where: { branch: { orgId }, ...branchFilter, start: { gte: from, lte: to } },
      _count: { id: true },
    }),
    prisma.appointment.groupBy({
      by: ["serviceId"],
      where: { branch: { orgId }, ...branchFilter, start: { gte: from, lte: to }, status: AppointmentStatus.DONE },
      _sum: { price: true },
    }),
  ]);

  const countMap = new Map(allCounts.map((c) => [c.serviceId, c._count.id]));
  const revMap = new Map(revenueGroups.map((r) => [r.serviceId, r._sum.price ?? 0]));

  return services
    .map((s) => ({
      id: s.id,
      name: s.name,
      count: countMap.get(s.id) ?? 0,
      revenue: revMap.get(s.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export async function getCommissionReport(period: string, orgId: string, branchId?: string) {
  const { from, to } = getDateRange(period);
  const branchFilter = branchId ? { branchId } : { branch: { orgId } };

  const [barbers, doneGroups, revenueGroups] = await Promise.all([
    prisma.barber.findMany({
      where: { active: true, branch: { orgId }, ...(branchId ? { branchId } : {}) },
      include: { user: { select: { name: true } } },
    }),
    prisma.appointment.groupBy({
      by: ["barberId"],
      where: { ...branchFilter, start: { gte: from, lte: to }, status: AppointmentStatus.DONE },
      _count: { id: true },
    }),
    prisma.appointment.groupBy({
      by: ["barberId"],
      where: { ...branchFilter, start: { gte: from, lte: to }, status: AppointmentStatus.DONE },
      _sum: { price: true },
    }),
  ]);

  const doneMap = new Map(doneGroups.map((c) => [c.barberId, c._count.id]));
  const revMap = new Map(revenueGroups.map((r) => [r.barberId, r._sum.price ?? 0]));

  return barbers
    .map((barber) => {
      const completed = doneMap.get(barber.id) ?? 0;
      const revenue = revMap.get(barber.id) ?? 0;
      const commission =
        barber.commissionType === CommissionType.PERCENTAGE
          ? Math.round(revenue * (barber.commissionValue / 100))
          : Math.round(barber.commissionValue * completed);
      return {
        id: barber.id,
        name: barber.user.name,
        commissionType: barber.commissionType,
        commissionValue: barber.commissionValue,
        completed,
        revenue,
        commission,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getDailyRevenue(period: string, orgId: string, branchId?: string) {
  const { from, to } = getDateRange(period);

  const appointments = await prisma.appointment.findMany({
    where: { branch: { orgId }, start: { gte: from, lte: to }, status: AppointmentStatus.DONE, ...(branchId ? { branchId } : {}) },
    select: { start: true, price: true },
    orderBy: { start: "asc" },
  });

  const byDate = new Map<string, number>();
  for (const apt of appointments) {
    const dateKey = apt.start.toISOString().split("T")[0];
    byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + apt.price);
  }

  return Array.from(byDate.entries()).map(([date, revenue]) => ({ date, revenue }));
}
