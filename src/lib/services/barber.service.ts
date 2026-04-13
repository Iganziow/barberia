import { prisma } from "@/lib/prisma";

export async function getBarbers(orgId: string, branchId?: string) {
  return prisma.barber.findMany({
    where: {
      active: true,
      branch: { orgId },
      ...(branchId ? { branchId } : {}),
    },
    include: {
      user: { select: { name: true, email: true, phone: true } },
    },
    orderBy: { user: { name: "asc" } },
  });
}

export async function getBarberById(id: string) {
  return prisma.barber.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
    },
  });
}

export async function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });
}
