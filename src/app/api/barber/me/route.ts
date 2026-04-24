import { NextResponse } from "next/server";
import { z } from "zod";
import { withBarber } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/sanitize";

const UpdateProfileSchema = z.object({
  phone: z.string().max(30).transform(stripHtml).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color inválido (use formato hex #rrggbb)")
    .optional(),
});

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
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfPrevMonth = startOfMonth;

  // 4 queries en paralelo:
  // - Citas de hoy → stats dashboard
  // - Pagos del mes → revenue + count → comisión
  // - Citas DONE del mes → cantidad completadas (para comisión FIXED)
  // - Pagos del mes anterior → comparativa % MoM
  const [
    todayAppointments,
    monthPayments,
    monthCompletedCount,
    prevMonthPayments,
    prevMonthCompletedCount,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        barberId: barber.id,
        start: { gte: startOfDay, lt: endOfDay },
        status: { not: "CANCELED" },
      },
      select: { status: true, price: true },
    }),
    prisma.payment.aggregate({
      where: {
        appointment: {
          barberId: barber.id,
          start: { gte: startOfMonth, lt: endOfMonth },
        },
        status: "PAID",
      },
      _sum: { amount: true, tip: true },
      _count: true,
    }),
    prisma.appointment.count({
      where: {
        barberId: barber.id,
        start: { gte: startOfMonth, lt: endOfMonth },
        status: "DONE",
      },
    }),
    prisma.payment.aggregate({
      where: {
        appointment: {
          barberId: barber.id,
          start: { gte: startOfPrevMonth, lt: endOfPrevMonth },
        },
        status: "PAID",
      },
      _sum: { amount: true },
    }),
    prisma.appointment.count({
      where: {
        barberId: barber.id,
        start: { gte: startOfPrevMonth, lt: endOfPrevMonth },
        status: "DONE",
      },
    }),
  ]);

  // Stats de hoy (igual que antes)
  const stats = todayAppointments.reduce(
    (acc, a) => {
      acc.totalToday++;
      if (a.status === "DONE") {
        acc.doneToday++;
        acc.revenueToday += a.price;
      }
      if (a.status === "RESERVED") acc.pendingToday++;
      return acc;
    },
    { totalToday: 0, doneToday: 0, revenueToday: 0, pendingToday: 0 }
  );

  // Cálculo de comisión según tipo del barbero
  const revenueMonth = monthPayments._sum.amount ?? 0;
  const tipsMonth = monthPayments._sum.tip ?? 0;
  const paidCountMonth = monthPayments._count;
  let commissionEarned = 0;
  if (barber.commissionType === "PERCENTAGE") {
    commissionEarned = Math.round((revenueMonth * barber.commissionValue) / 100);
  } else {
    // FIXED: monto por cita completada, independiente del precio
    commissionEarned = monthCompletedCount * barber.commissionValue;
  }

  // Comparativa con mes anterior (para "+12% vs mes pasado" tipo dashboard)
  const prevRevenue = prevMonthPayments._sum.amount ?? 0;
  let prevCommission = 0;
  if (barber.commissionType === "PERCENTAGE") {
    prevCommission = Math.round((prevRevenue * barber.commissionValue) / 100);
  } else {
    prevCommission = prevMonthCompletedCount * barber.commissionValue;
  }
  const commissionDeltaPct =
    prevCommission > 0
      ? Math.round(((commissionEarned - prevCommission) / prevCommission) * 100)
      : null;

  return NextResponse.json({
    barber: {
      id: barber.id,
      name: barber.user.name,
      email: barber.user.email,
      phone: barber.user.phone,
      color: barber.color,
      branch: barber.branch,
      commissionType: barber.commissionType,
      commissionValue: barber.commissionValue,
    },
    stats,
    month: {
      revenue: revenueMonth,
      tips: tipsMonth,
      paidCount: paidCountMonth,
      completed: monthCompletedCount,
      commissionEarned,
      commissionDeltaPct, // null si el mes anterior tenía 0
      avgTicket: paidCountMonth > 0 ? Math.round(revenueMonth / paidCountMonth) : 0,
    },
  });
});

/**
 * PATCH /api/barber/me
 * El barbero actualiza sus propios datos limitados: teléfono y color del
 * calendario. No puede editar nombre/email/rol (lo hace el admin para
 * evitar cambios de identidad accidentales o malintencionados).
 */
export const PATCH = withBarber(async (req, { userId }) => {
  const body = await req.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const barber = await prisma.barber.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!barber) throw AppError.notFound("Barbero no encontrado");

  // Dos updates (user.phone + barber.color) en transacción atómica
  await prisma.$transaction(async (tx) => {
    if (parsed.data.phone !== undefined) {
      await tx.user.update({
        where: { id: userId },
        data: { phone: parsed.data.phone || null },
      });
    }
    if (parsed.data.color !== undefined) {
      await tx.barber.update({
        where: { id: barber.id },
        data: { color: parsed.data.color },
      });
    }
  });

  return NextResponse.json({ ok: true });
});
