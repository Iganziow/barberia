import { prisma } from "@/lib/prisma";

export async function getBarbers(orgId: string, branchId?: string) {
  return prisma.barber.findMany({
    where: {
      active: true,
      branch: { orgId },
      ...(branchId ? { branchId } : {}),
    },
    include: {
      user: { select: { name: true } },
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
