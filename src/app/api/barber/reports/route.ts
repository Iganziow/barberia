import { NextResponse } from "next/server";
import { withBarber } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

type Period = "today" | "week" | "month" | "year";

function getRange(period: Period): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "today": {
      const from = today;
      const to = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const prevFrom = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const prevTo = today;
      return { from, to, prevFrom, prevTo };
    }
    case "week": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      const to = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const prevFrom = new Date(from);
      prevFrom.setDate(prevFrom.getDate() - 7);
      const prevTo = from;
      return { from, to, prevFrom, prevTo };
    }
    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevTo = from;
      return { from, to, prevFrom, prevTo };
    }
    case "year": {
      const from = new Date(now.getFullYear(), 0, 1);
      const to = new Date(now.getFullYear() + 1, 0, 1);
      const prevFrom = new Date(now.getFullYear() - 1, 0, 1);
      const prevTo = from;
      return { from, to, prevFrom, prevTo };
    }
  }
}

/**
 * GET /api/barber/reports?period=month
 *
 * Reportes específicos para el barbero logueado (scope estricto). Devuelve:
 * - dashboard: counts por status + revenue del período + comisión computada
 * - dailyRevenue: serie diaria de ingresos para gráfico
 * - services: top 5 servicios más vendidos por el barbero
 * - delta: comparativa con el período anterior (% de variación)
 *
 * Períodos válidos: today | week | month | year (default month).
 */
export const GET = withBarber(async (req, { userId }) => {
  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") as Period) || "month";
  if (!["today", "week", "month", "year"].includes(period)) {
    throw AppError.badRequest("Período inválido");
  }

  const barber = await prisma.barber.findUnique({
    where: { userId },
    select: { id: true, commissionType: true, commissionValue: true },
  });
  if (!barber) throw AppError.notFound("Barbero no encontrado");

  const { from, to, prevFrom, prevTo } = getRange(period);

  // Queries en paralelo: actuales + previas + serie diaria + servicios
  const [appts, payments, prevAppts, prevPayments, dailyApptsRaw, servicesAgg] = await Promise.all([
    prisma.appointment.findMany({
      where: { barberId: barber.id, start: { gte: from, lt: to } },
      select: { status: true, price: true, start: true, serviceId: true },
    }),
    prisma.payment.aggregate({
      where: {
        appointment: { barberId: barber.id, start: { gte: from, lt: to } },
        status: "PAID",
      },
      _sum: { amount: true, tip: true },
      _count: true,
    }),
    prisma.appointment.findMany({
      where: { barberId: barber.id, start: { gte: prevFrom, lt: prevTo } },
      select: { status: true, price: true },
    }),
    prisma.payment.aggregate({
      where: {
        appointment: { barberId: barber.id, start: { gte: prevFrom, lt: prevTo } },
        status: "PAID",
      },
      _sum: { amount: true },
    }),
    // Para la serie diaria — solo trae citas con payment, agrupamos en JS
    prisma.appointment.findMany({
      where: {
        barberId: barber.id,
        start: { gte: from, lt: to },
        payment: { is: { status: "PAID" } },
      },
      select: { start: true, payment: { select: { amount: true } } },
    }),
    // Top servicios
    prisma.appointment.groupBy({
      by: ["serviceId"],
      where: {
        barberId: barber.id,
        start: { gte: from, lt: to },
        status: "DONE",
      },
      _count: { id: true },
      _sum: { price: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  // Stats agregadas
  const total = appts.length;
  const completed = appts.filter((a) => a.status === "DONE").length;
  const canceled = appts.filter((a) => a.status === "CANCELED").length;
  const noShow = appts.filter((a) => a.status === "NO_SHOW").length;
  const upcoming = appts.filter((a) =>
    ["RESERVED", "CONFIRMED", "ARRIVED", "IN_PROGRESS"].includes(a.status)
  ).length;

  const revenue = payments._sum.amount ?? 0;
  const tips = payments._sum.tip ?? 0;
  const paidCount = payments._count;
  const avgTicket = paidCount > 0 ? Math.round(revenue / paidCount) : 0;

  // Comisión
  let commission = 0;
  if (barber.commissionType === "PERCENTAGE") {
    commission = Math.round((revenue * barber.commissionValue) / 100);
  } else {
    commission = completed * barber.commissionValue;
  }

  // Delta vs período anterior
  const prevRevenue = prevPayments._sum.amount ?? 0;
  const prevCompleted = prevAppts.filter((a) => a.status === "DONE").length;
  const revenueDeltaPct =
    prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null;
  const completedDeltaPct =
    prevCompleted > 0
      ? Math.round(((completed - prevCompleted) / prevCompleted) * 100)
      : null;

  // Serie diaria (agrupada por fecha YYYY-MM-DD)
  const dailyMap = new Map<string, number>();
  for (const a of dailyApptsRaw) {
    const key = a.start.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + (a.payment?.amount ?? 0));
  }
  // Llenar todos los días del rango con 0 para que el gráfico se vea continuo
  const dailyRevenue: Array<{ date: string; revenue: number }> = [];
  const cursor = new Date(from);
  while (cursor < to) {
    const key = cursor.toISOString().slice(0, 10);
    dailyRevenue.push({ date: key, revenue: dailyMap.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Top servicios — necesitamos los nombres
  const serviceIds = servicesAgg.map((s) => s.serviceId);
  const serviceNames =
    serviceIds.length > 0
      ? await prisma.service.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true, name: true },
        })
      : [];
  const services = servicesAgg.map((s) => ({
    id: s.serviceId,
    name: serviceNames.find((sn) => sn.id === s.serviceId)?.name ?? "(sin nombre)",
    count: s._count.id,
    revenue: s._sum.price ?? 0,
  }));

  return NextResponse.json({
    period,
    dashboard: {
      appointments: { total, completed, canceled, noShow, upcoming },
      revenue,
      tips,
      paidCount,
      avgTicket,
      commission,
      revenueDeltaPct,
      completedDeltaPct,
    },
    dailyRevenue,
    services,
  });
});
