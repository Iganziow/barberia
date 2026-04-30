import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-error";
import { dispatchWebhook } from "@/lib/services/webhook.service";
import { sendStatusChangeEmail } from "@/lib/services/email.service";
import { invalidateAvailability } from "@/lib/cache/availability-cache";
import type { UpdateStatusInput } from "@/lib/validations/appointment";

export type AppointmentFilters = {
  orgId: string;
  branchId?: string;
  barberId?: string;
  from?: Date;
  to?: Date;
};

export async function getAppointments(filters: AppointmentFilters) {
  return prisma.appointment.findMany({
    where: {
      branch: { orgId: filters.orgId },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.barberId ? { barberId: filters.barberId } : {}),
      ...(filters.from || filters.to
        ? {
            start: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    },
    // Usamos select (no include) para evitar over-fetch: Prisma default
    // trae TODOS los fields de barber/client si usamos include. Con select
    // explícito solo cargamos lo que el cliente consume en /api/admin/appointments
    // y /api/admin/appointments/export.
    select: {
      id: true,
      start: true,
      end: true,
      status: true,
      price: true,
      notePublic: true,
      noteInternal: true,
      barberId: true,
      serviceId: true,
      clientId: true,
      barber: { select: { user: { select: { name: true } } } },
      service: { select: { name: true } },
      client: { select: { user: { select: { name: true, phone: true } } } },
      payment: { select: { id: true } },
    },
    orderBy: { start: "asc" },
  });
}

// `createAppointment` se eliminó: la creación ahora vive directamente
// en /api/admin/appointments POST envuelta en transacción + validación
// atómica de slot. Mantener el helper exportable invitaba a usarlo
// sin validar (admin POST anterior tenía ese bug exacto).

export async function getAppointmentById(id: string, orgId?: string) {
  return prisma.appointment.findFirst({
    where: { id, ...(orgId ? { branch: { orgId } } : {}) },
    select: {
      id: true,
      start: true,
      end: true,
      status: true,
      price: true,
      notePublic: true,
      noteInternal: true,
      cancelReason: true,
      createdAt: true,
      barberId: true,
      serviceId: true,
      clientId: true,
      barber: { select: { id: true, user: { select: { name: true } } } },
      service: { select: { id: true, name: true, durationMin: true, price: true } },
      client: { select: { id: true, user: { select: { name: true, email: true, phone: true } } } },
      branch: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          latitude: true,
          longitude: true,
          organization: { select: { name: true } },
        },
      },
      payment: {
        select: {
          id: true,
          amount: true,
          tip: true,
          method: true,
          status: true,
          paidAt: true,
        },
      },
    },
  });
}

export async function updateAppointmentStatus(
  id: string,
  data: UpdateStatusInput,
  orgId?: string
) {
  // Verify appointment belongs to org before updating
  if (orgId) {
    const apt = await prisma.appointment.findFirst({
      where: { id, branch: { orgId } },
      select: { id: true, payment: { select: { id: true } } },
    });
    if (!apt) return null;

    // Si piden crear un payment pero ya existe uno, rechazamos (evita duplicados).
    // Antes era un Error genérico → handleError lo convertía a 500. Ahora
    // AppError.conflict → 409 con mensaje claro al cliente.
    if (data.payment && apt.payment) {
      throw AppError.conflict("Esta cita ya tiene un pago registrado");
    }
  }

  // Payment + status en la misma transacción atómica. Si el update del
  // status falla, el payment tampoco se crea (rollback). Así evitamos el
  // estado inconsistente "pagado pero no finalizado".
  const updated = await prisma.$transaction(async (tx) => {
    if (data.payment) {
      await tx.payment.create({
        data: {
          appointmentId: id,
          amount: data.payment.amount,
          tip: data.payment.tip,
          method: data.payment.method,
          status: "PAID",
          paidAt: new Date(),
        },
      });
    }
    return tx.appointment.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.cancelReason ? { cancelReason: data.cancelReason } : {}),
        // Si se envía noteInternal (incluso string vacío como null),
        // lo persistimos en la misma transacción atómica.
        ...(data.noteInternal !== undefined
          ? { noteInternal: data.noteInternal || null }
          : {}),
      },
      include: {
        // Incluimos branch.id también — necesario para invalidar el caché
        // de availability por sucursal después del status change.
        branch: { select: { id: true, orgId: true } },
        service: { select: { name: true } },
        barber: { include: { user: { select: { name: true } } } },
      },
    });
  });

  // Fire webhook for status changes (fire-and-forget)
  const webhookOrg = orgId || updated.branch.orgId;
  if (data.status === "DONE") {
    dispatchWebhook(webhookOrg, "appointment.completed", {
      appointmentId: updated.id,
      status: updated.status,
      serviceName: updated.service.name,
      barberName: updated.barber.user.name,
      price: updated.price,
    }).catch(() => {});
  } else if (data.status === "CANCELED") {
    dispatchWebhook(webhookOrg, "appointment.canceled", {
      appointmentId: updated.id,
      status: updated.status,
    }).catch(() => {});
  }

  // Send email notification for status changes (fire-and-forget)
  if (data.status === "CONFIRMED" || data.status === "CANCELED") {
    sendStatusChangeEmail(updated.id, data.status).catch(() => {});
  }

  // Invalida availability cuando el cambio libera u ocupa un slot.
  // CANCELED y NO_SHOW liberan; volver de CANCELED → RESERVED ocupa.
  // Por simplicidad y baja frecuencia, invalidamos en cualquier cambio
  // de status — barato (solo marca un tag) y evita olvidar casos.
  invalidateAvailability({
    barberId: updated.barberId,
    branchId: updated.branch.id,
  });

  return updated;
}

/**
 * Reprogramar una cita (drag-to-reschedule, resize, o cambio de barbero).
 * Reusa `validateAppointmentSlot` para validar TODO: schedule del barbero
 * + horario de sucursal + overlap citas + overlap bloqueos. Antes solo
 * miraba citas y bloqueos, perdiendo el caso "el barbero no trabaja ese día".
 *
 * Throws Error con mensaje legible si hay conflicto. Devuelve null si la
 * cita no existe en el org.
 */
export async function rescheduleAppointment(
  id: string,
  data: { start: string; end: string; barberId?: string },
  orgId: string
) {
  const existing = await prisma.appointment.findFirst({
    where: { id, branch: { orgId } },
    select: { id: true, barberId: true, branchId: true },
  });
  if (!existing) return null;

  const newStart = new Date(data.start);
  const newEnd = new Date(data.end);
  const targetBarberId = data.barberId || existing.barberId;

  // Lazy import para evitar ciclo (availability.service podría usar este file).
  const { validateAppointmentSlot, slotConflictMessage, acquireBarberLock } = await import(
    "@/lib/services/availability.service"
  );

  const updated = await prisma.$transaction(async (tx) => {
    // Lock advisory por barbero (target). Si la cita cambia de barbero,
    // bloqueamos el del destino — el del origen pierde el slot
    // automáticamente porque la cita misma se está moviendo.
    await acquireBarberLock(tx as unknown as typeof prisma, targetBarberId);

    const conflict = await validateAppointmentSlot(
      tx as unknown as typeof prisma,
      {
        barberId: targetBarberId,
        branchId: existing.branchId,
        start: newStart,
        end: newEnd,
      },
      { excludeAppointmentId: id, rejectPast: false }
    );
    if (conflict) {
      throw new Error(slotConflictMessage(conflict));
    }
    return tx.appointment.update({
      where: { id },
      data: {
        start: newStart,
        end: newEnd,
        ...(data.barberId ? { barberId: data.barberId } : {}),
      },
    });
  });

  // Invalida availability del barbero origen y destino (si cambió). El
  // origen libera su slot anterior, el destino lo ocupa. La sucursal es
  // la misma porque rescheduleAppointment no cambia branchId.
  invalidateAvailability({ barberId: existing.barberId, branchId: existing.branchId });
  if (data.barberId && data.barberId !== existing.barberId) {
    invalidateAvailability({ barberId: data.barberId });
  }

  return updated;
}
