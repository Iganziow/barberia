import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getBarbers } from "@/lib/services/barber.service";
import { stripHtml } from "@/lib/sanitize";
import bcrypt from "bcryptjs";

export const GET = withAdmin(async (req, { orgId }) => {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || undefined;

  const barbers = await getBarbers(orgId, branchId);

  return NextResponse.json({
    barbers: barbers.map((b) => ({
      id: b.id,
      name: b.user.name,
      email: b.user.email,
      phone: b.user.phone,
      color: b.color,
      active: b.active,
      commissionType: b.commissionType,
      commissionValue: b.commissionValue,
    })),
  });
});

export const POST = withAdmin(async (req, { orgId }) => {
  const body = await req.json().catch(() => null);
  if (!body) throw AppError.badRequest("JSON inválido");

  const { name, email, phone, password, color, branchId } = body;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    throw AppError.badRequest("Nombre, email y contraseña son requeridos");
  }
  if (password.length < 6) throw AppError.badRequest("Contraseña: mínimo 6 caracteres");

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) throw AppError.conflict("Este email ya está registrado");

  const branch = branchId
    ? await prisma.branch.findFirst({ where: { id: branchId, orgId } })
    : await prisma.branch.findFirst({ where: { orgId }, orderBy: { createdAt: "asc" } });
  if (!branch) throw AppError.notFound("Sucursal no encontrada");

  const hash = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: stripHtml(name.trim()),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        password: hash,
        role: "BARBER",
        orgId,
      },
    });
    const barber = await tx.barber.create({
      data: { userId: user.id, branchId: branch.id, color: color || null, commissionType: "PERCENTAGE", commissionValue: 0 },
    });
    return { user, barber };
  });

  return NextResponse.json({ barber: { id: result.barber.id, name: result.user.name, email: result.user.email } }, { status: 201 });
});
