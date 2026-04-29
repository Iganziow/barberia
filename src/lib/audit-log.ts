import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Acciones auditables. Lista cerrada para que el dashboard pueda
 * agruparlas y filtrarlas. Convención: "<resource>.<verb>"
 */
export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.logout_all"
  | "auth.password_change"
  | "barber.create"
  | "barber.update"
  | "barber.delete"
  | "barber.deactivate"
  | "service.create"
  | "service.update"
  | "service.delete"
  | "branch.create"
  | "branch.update"
  | "branch.delete"
  | "client.delete"
  | "client.bulk_import"
  | "appointment.create"
  | "appointment.delete"
  | "appointment.cancel"
  | "appointment.reschedule"
  | "payment.refund"
  | "apikey.create"
  | "apikey.revoke"
  | "webhook.create"
  | "webhook.delete"
  | "organization.update"
  | "schedule.update";

export type AuditContext = {
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  orgId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

export type AuditPayload = {
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Registra una acción auditable. Es **fire-and-forget**: si la escritura
 * falla (ej. DB temporariamente inaccesible), loguea el error pero NO
 * bloquea la operación principal. Es preferible perder un log a fallar
 * la mutación de negocio.
 *
 * Uso típico desde un handler admin:
 *
 *   await recordAudit(req, { userId, userEmail, userRole, orgId }, {
 *     action: "barber.delete",
 *     resource: "Barber",
 *     resourceId: barber.id,
 *     metadata: { name: barber.name },
 *   });
 */
export async function recordAudit(
  req: Request | null,
  ctx: AuditContext,
  event: AuditPayload
): Promise<void> {
  try {
    const ip =
      ctx.ip ??
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    const userAgent = ctx.userAgent ?? req?.headers.get("user-agent") ?? null;

    await prisma.auditLog.create({
      data: {
        userId: ctx.userId ?? null,
        userEmail: ctx.userEmail ?? null,
        userRole: ctx.userRole ?? null,
        orgId: ctx.orgId ?? null,
        action: event.action,
        resource: event.resource ?? null,
        resourceId: event.resourceId ?? null,
        metadata: event.metadata,
        ip,
        userAgent,
      },
    });
  } catch (err) {
    // No tirar — si auditing falla, la operación de negocio debe seguir.
    // En producción esto debería ir a Sentry/Datadog para alertarse.
    console.error("[audit] Failed to record audit log:", err);
  }
}
