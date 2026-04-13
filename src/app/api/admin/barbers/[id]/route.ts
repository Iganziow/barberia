import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/sanitize";
import bcrypt from "bcryptjs";

export const GET = withAdmin(async (_req, { orgId }, { params }) => {
  const { id } = await params;

  const barber = await prisma.barber.findFirst({
    where: { id, branch: { orgId } },
    include: { user: { select: { name: true, email: true, phone: true } } },
  });
  if (!barber) throw AppError.notFound("Barbero no encontrado");

  return NextResponse.json({
    barber: {
      id: barber.id,
      name: barber.user.name,
      email: barber.user.email,
      phone: barber.user.phone,
      color: barber.color,
      active: barber.active,
      commissionType: barber.commissionType,
      commissionValue: barber.commissionValue,
    },
  });
});

export const PATCH = withAdmin(async (req, { orgId }, { params }) => {
  const { id: barberId } = await params;

  const barber = await prisma.barber.findFirst({
    where: { id: barberId, branch: { orgId } },
    select: { id: true, userId: true },
  });
  if (!barber) throw AppError.notFound("Barbero no encontrado");

  const body = await req.json().catch(() => null);
  if (!body) throw AppError.badRequest("JSON inválido");

  const userUpdates: Record<string, unknown> = {};
  const barberUpdates: Record<string, unknown> = {};

  // User fields
  if (body.name !== undefined) userUpdates.name = stripHtml(String(body.name).trim());
  if (body.phone !== undefined) userUpdates.phone = body.phone ? String(body.phone).trim() : null;
  if (body.email !== undefined) {
    const newEmail = String(body.email).trim().toLowerCase();
    const existing = await prisma.user.findFirst({ where: { email: newEmail, id: { not: barber.userId } } });
    if (existing) throw AppError.conflict("Este email ya está registrado");
    userUpdates.email = newEmail;
  }

  // Password change
  if (body.password) {
    if (body.password.length < 6) throw AppError.badRequest("Contraseña: mínimo 6 caracteres");
    userUpdates.password = await bcrypt.hash(body.password, 10);
  }

  // Barber fields
  if (body.color !== undefined) barberUpdates.color = body.color || null;
  if (body.active !== undefined) barberUpdates.active = Boolean(body.active);

  // Commission
  if (body.commissionType !== undefined && body.commissionValue !== undefined) {
    if (!["PERCENTAGE", "FIXED"].includes(body.commissionType) || typeof body.commissionValue !== "number" || body.commissionValue < 0) {
      throw AppError.badRequest("Datos de comisión inválidos");
    }
    if (body.commissionType === "PERCENTAGE" && body.commissionValue > 100) {
      throw AppError.badRequest("El porcentaje no puede ser mayor a 100");
    }
    barberUpdates.commissionType = body.commissionType;
    barberUpdates.commissionValue = body.commissionValue;
  }

  // Apply updates
  if (Object.keys(userUpdates).length > 0) {
    await prisma.user.update({ where: { id: barber.userId }, data: userUpdates });
  }
  if (Object.keys(barberUpdates).length > 0) {
    await prisma.barber.update({ where: { id: barberId }, data: barberUpdates });
  }

  return NextResponse.json({ ok: true });
});

export const DELETE = withAdmin(async (_req, { orgId }, { params }) => {
  const { id: barberId } = await params;

  const barber = await prisma.barber.findFirst({ where: { id: barberId, branch: { orgId } } });
  if (!barber) throw AppError.notFound("Barbero no encontrado");

  // Soft delete: deactivate instead of deleting (preserves appointment history)
  await prisma.barber.update({ where: { id: barberId }, data: { active: false } });

  return NextResponse.json({ ok: true });
});
