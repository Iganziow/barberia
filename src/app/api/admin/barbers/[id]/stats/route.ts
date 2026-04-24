import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/barbers/[id]/stats
 *
 * Devuelve las métricas del barbero para el mes en curso + totales
 * históricos. Se usa en el tab "Perfil" de /admin/barbers para
 * contextualizar al equipo y poder comparar performance entre barberos.
 *
 * Todas las cifras están scoped al org vía join con branch.orgId.
 */
export const GET = withAdmin(async (_req, { orgId }, { params }) => {
  const { id } = await params;

  // Verifica que el barbero pertenezca al org (evita filtraciones cross-tenant)
  const barber = await prisma.barber.findFirst({
    where: { id, branch: { orgId } },
    select: { id: true, branchId: true, createdAt: true },
  });
  if (!barber) throw AppError.notFound("Barbero no encontrado");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // 3 queries en paralelo:
  // - counts de citas por status este mes
  // - suma de revenue (pagos confirmados) este mes
  // - totales históricos
  const [monthAppointments, monthPayments, totalCompleted] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        barberId: id,
        start: { gte: monthStart, lte: monthEnd },
      },
      select: { status: true, price: true, payment: { select: { amount: true, tip: true } } },
    }),
    prisma.payment.aggregate({
      where: {
        appointment: {
          barberId: id,
          start: { gte: monthStart, lte: monthEnd },
        },
        status: "PAID",
      },
      _sum: { amount: true, tip: true },
      _count: true,
    }),
    prisma.appointment.count({
      where: { barberId: id, status: "DONE" },
    }),
  ]);

  const total = monthAppointments.length;
  const completed = monthAppointments.filter((a) => a.status === "DONE").length;
  const canceled = monthAppointments.filter((a) => a.status === "CANCELED").length;
  const noShow = monthAppointments.filter((a) => a.status === "NO_SHOW").length;
  const upcoming = monthAppointments.filter((a) =>
    ["RESERVED", "CONFIRMED", "ARRIVED", "IN_PROGRESS"].includes(a.status)
  ).length;

  const revenueTotal = monthPayments._sum.amount ?? 0;
  const tipTotal = monthPayments._sum.tip ?? 0;
  const paidCount = monthPayments._count;
  const avgTicket = paidCount > 0 ? Math.round(revenueTotal / paidCount) : 0;

  return NextResponse.json({
    month: {
      appointments: { total, completed, canceled, noShow, upcoming },
      revenue: {
        total: revenueTotal,
        tips: tipTotal,
        paidCount,
        avgTicket,
      },
    },
    allTime: {
      completedAppointments: totalCompleted,
    },
    joinedAt: barber.createdAt.toISOString(),
  });
});
