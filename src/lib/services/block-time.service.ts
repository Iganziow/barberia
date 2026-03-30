import { prisma } from "@/lib/prisma";
import type { CreateBlockTimeInput } from "@/lib/validations/block-time";

export type BlockTimeFilters = {
  orgId: string;
  barberId?: string;
  from?: Date;
  to?: Date;
};

export async function getBlockTimes(filters: BlockTimeFilters) {
  return prisma.blockTime.findMany({
    where: {
      barber: { branch: { orgId: filters.orgId } },
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
    },
    orderBy: { start: "asc" },
  });
}

export async function createBlockTime(data: CreateBlockTimeInput) {
  return prisma.blockTime.create({
    data: {
      reason: data.reason,
      start: new Date(data.start),
      end: new Date(data.end),
      allDay: data.allDay,
      barberId: data.barberId,
    },
  });
}
