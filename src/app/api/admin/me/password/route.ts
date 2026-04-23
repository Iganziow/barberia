import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Contraseña actual requerida"),
    newPassword: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmar contraseña requerida"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "La nueva contraseña no coincide con la confirmación",
    path: ["confirmPassword"],
  });

/**
 * PATCH /api/admin/me/password
 * Cambia la contraseña del usuario autenticado. Requiere la contraseña actual
 * para evitar cambios no autorizados si alguien toma una sesión abierta.
 */
export const PATCH = withAdmin(async (req, { userId }) => {
  // Rate limit por usuario: máximo 5 cambios de contraseña por hora.
  // Clave scoped por userId (no por IP) para prevenir brute force incluso
  // si el atacante rota IPs detrás de un proxy.
  const { allowed } = rateLimit(`pwd:${userId}`, {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hora
  });
  if (!allowed) {
    return NextResponse.json(
      { message: "Demasiados intentos. Intenta de nuevo en una hora." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("Usuario no encontrado");

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!valid) {
    return NextResponse.json(
      { message: "La contraseña actual es incorrecta" },
      { status: 400 }
    );
  }

  // No permitir reusar la misma contraseña
  const same = await bcrypt.compare(parsed.data.newPassword, user.password);
  if (same) {
    return NextResponse.json(
      { message: "La nueva contraseña debe ser distinta a la actual" },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hash },
  });

  return NextResponse.json({ ok: true });
});
