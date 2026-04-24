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
