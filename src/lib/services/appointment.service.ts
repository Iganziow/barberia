import { prisma } from "@/lib/prisma";
import { dispatchWebhook } from "@/lib/services/webhook.service";
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
    include: {
      barber: { include: { user: { select: { name: true } } } },
      service: { select: { name: true } },
      client: { include: { user: { select: { name: true } } } },
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
    include: {
      barber: { include: { user: { select: { name: true } } } },
      service: { select: { id: true, name: true, durationMin: true, price: true } },
      client: { include: { user: { select: { name: true, email: true, phone: true } } } },
      payment: true,
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

  return updated;
}
