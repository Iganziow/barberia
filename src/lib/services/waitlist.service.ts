import { prisma } from "@/lib/prisma";
import type { CreateWaitlistInput } from "@/lib/validations/waitlist";

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().+]/g, "").replace(/^56/, "");
}

export async function addToWaitlist(data: CreateWaitlistInput) {
  const normalizedPhone = normalizePhone(data.clientPhone);

  // Check if already on waitlist for this date/service/barber
  const existing = await prisma.waitlist.findFirst({
    where: {
      clientPhone: normalizedPhone,
      serviceId: data.serviceId,
      preferredDate: data.preferredDate,
      branchId: data.branchId,
      barberId: data.barberId || null,
      status: "ACTIVE",
    },
  });

  if (existing) {
    const position = await getPosition(existing.id);
    return { id: existing.id, position, alreadyExists: true };
  }

  const entry = await prisma.waitlist.create({
    data: {
      clientName: data.clientName,
      clientPhone: normalizedPhone,
      serviceId: data.serviceId,
      barberId: data.barberId || null,
      preferredDate: data.preferredDate,
      branchId: data.branchId,
    },
  });

  const position = await getPosition(entry.id);
  return { id: entry.id, position, alreadyExists: false };
}

export async function getPosition(waitlistId: string): Promise<number> {
  const entry = await prisma.waitlist.findUnique({ where: { id: waitlistId } });
  if (!entry) return 0;

  const ahead = await prisma.waitlist.count({
    where: {
      branchId: entry.branchId,
      serviceId: entry.serviceId,
      preferredDate: entry.preferredDate,
      status: "ACTIVE",
      createdAt: { lt: entry.createdAt },
    },
  });

  return ahead + 1;
}

export async function getWaitlistByPhone(phone: string) {
  const normalizedPhone = normalizePhone(phone);

  return prisma.waitlist.findMany({
    where: {
      clientPhone: normalizedPhone,
      status: { in: ["ACTIVE", "NOTIFIED"] },
    },
    include: {
      service: { select: { name: true, durationMin: true, price: true } },
      barber: { include: { user: { select: { name: true } } } },
      branch: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminWaitlist(orgId: string, filters?: { date?: string; branchId?: string }) {
  return prisma.waitlist.findMany({
    where: {
      branch: { orgId },
      status: { in: ["ACTIVE", "NOTIFIED"] },
      ...(filters?.date ? { preferredDate: filters.date } : {}),
      ...(filters?.branchId ? { branchId: filters.branchId } : {}),
    },
    include: {
      service: { select: { name: true, price: true } },
      barber: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function updateWaitlistStatus(id: string, status: "NOTIFIED" | "BOOKED" | "EXPIRED") {
  return prisma.waitlist.update({
    where: { id },
    data: { status },
  });
}
