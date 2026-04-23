import { prisma } from "@/lib/prisma";
import { dispatchWebhook } from "@/lib/services/webhook.service";
import { sendStatusChangeEmail } from "@/lib/services/email.service";
import type { CreateAppointmentInput, UpdateStatusInput } from "@/lib/validations/appointment";

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

export async function createAppointment(data: CreateAppointmentInput) {
  return prisma.appointment.create({
    data: {
      start: new Date(data.start),
      end: new Date(data.end),
      price: data.price,
      barberId: data.barberId,
      serviceId: data.serviceId,
      clientId: data.clientId,
      branchId: data.branchId,
      notePublic: data.notePublic || null,
      noteInternal: data.noteInternal || null,
    },
  });
}

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
      select: { id: true },
    });
    if (!apt) return null;
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: data.status,
      ...(data.cancelReason ? { cancelReason: data.cancelReason } : {}),
    },
    include: {
      branch: { select: { orgId: true } },
      service: { select: { name: true } },
      barber: { include: { user: { select: { name: true } } } },
    },
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

  return updated;
}

/**
 * Reprogramar una cita (drag-to-reschedule o cambio de barbero).
 * Valida overlap con otras citas/bloqueos del mismo barbero.
 */
export async function rescheduleAppointment(
  id: string,
  data: { start: string; end: string; barberId?: string },
  orgId: string
) {
  const existing = await prisma.appointment.findFirst({
    where: { id, branch: { orgId } },
    select: { id: true, barberId: true },
  });
  if (!existing) return null;

  const newStart = new Date(data.start);
  const newEnd = new Date(data.end);
  const targetBarberId = data.barberId || existing.barberId;

  // Check overlap con otras citas activas del barbero
  const overlappingApt = await prisma.appointment.findFirst({
    where: {
      id: { not: id },
      barberId: targetBarberId,
      status: { notIn: ["CANCELED", "NO_SHOW"] },
      start: { lt: newEnd },
      end: { gt: newStart },
    },
    select: { id: true },
  });
  if (overlappingApt) {
    throw new Error("Overlap con otra cita del barbero");
  }

  // Check overlap con bloqueos
  const overlappingBlock = await prisma.blockTime.findFirst({
    where: {
      barberId: targetBarberId,
      start: { lt: newEnd },
      end: { gt: newStart },
    },
    select: { id: true },
  });
  if (overlappingBlock) {
    throw new Error("Overlap con horario bloqueado");
  }

  return prisma.appointment.update({
    where: { id },
    data: {
      start: newStart,
      end: newEnd,
      ...(data.barberId ? { barberId: data.barberId } : {}),
    },
  });
}
