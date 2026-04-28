import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes, randomUUID } from "crypto";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/sanitize";

/**
 * Bulk-import de clientes desde una fuente externa (ej: export de
 * Agenda Pro). Idempotente: si el teléfono + role=CLIENT ya existe,
 * skip — no se duplica ni se sobrescribe.
 *
 * Recibe un array de hasta 1000 clientes por request. Para lotes más
 * grandes el caller debe chunkear.
 *
 * Solo accesible para ADMIN — no expuesto al público.
 */
const ClientImportItem = z.object({
  /** 9 dígitos sin prefijo +56 (ej "912345678"). Es la llave dedup. */
  phone: z.string().regex(/^[2-9]\d{8}$/, "Teléfono debe ser 9 dígitos chilenos válidos"),
  name: z.string().min(1).max(200).transform((s) => stripHtml(s.trim())),
  // Email es opcional. Aceptamos string vacío, null, y omitido para
  // facilitar imports desde fuentes externas que pueden representar
  // "sin email" de varias formas (email es UNIQUE en User, así que
  // generamos uno sintético si no viene).
  email: z.preprocess(
    (v) => {
      if (v === null || v === undefined || v === "") return undefined;
      return v;
    },
    z.string().email().optional()
  ),
});

const ImportSchema = z.object({
  clients: z.array(ClientImportItem).min(1).max(1000),
});

export const POST = withAdmin(async (req, { orgId }) => {
  const json = await req.json().catch(() => null);
  const parsed = ImportSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const items = parsed.data.clients;
  const results = {
    total: items.length,
    created: 0,
    skipped: 0,
    errors: [] as Array<{ phone: string; name: string; reason: string }>,
  };

  for (const item of items) {
    try {
      // Buscar si el cliente (User+CLIENT con ese phone) ya existe
      const existing = await prisma.user.findFirst({
        where: { phone: item.phone, role: "CLIENT" },
        select: { id: true },
      });
      if (existing) {
        results.skipped++;
        continue;
      }

      // Email sintético si no provee uno (User.email es @unique).
      // Usamos UUID para evitar colisiones en imports paralelos.
      const email = item.email && item.email.length > 0
        ? item.email
        : `client.${randomUUID()}@noemail.local`;

      // Verificar si ese email ya existe (puede ser un user con otro phone)
      // — saltamos para evitar UniqueConstraint error.
      const emailTaken = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (emailTaken) {
        results.errors.push({
          phone: item.phone,
          name: item.name,
          reason: `Email ${email} ya está en uso`,
        });
        continue;
      }

      // Crear User + Client en una transacción atómica.
      // Linkeamos el User al orgId del admin que importa para que los
      // clientes aparezcan en /admin/clients aún sin citas (el listing
      // filtra por orgScope que mira tanto appointments como user.orgId).
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: item.name,
            email,
            phone: item.phone,
            password: randomBytes(32).toString("hex"),
            role: "CLIENT",
            orgId,
          },
        });
        await tx.client.create({
          data: { userId: user.id },
        });
      });
      results.created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      results.errors.push({
        phone: item.phone,
        name: item.name,
        reason: msg,
      });
    }
  }

  // Si hubo más errores que éxitos, devolvemos 207 (multi-status)
  // para que el caller pueda reaccionar. Si todo OK, 200.
  const status = results.errors.length > results.created ? 207 : 200;

  return NextResponse.json(results, { status });
});

// Endpoint solo para POST. Cualquier otro método responde 405.
export function GET() {
  throw AppError.badRequest("Use POST con un array de clientes");
}
