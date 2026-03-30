import { prisma } from "@/lib/prisma";

export async function getPublicBranchInfo(orgId: string) {
  const branch = await prisma.branch.findFirst({
    where: { orgId },
    include: {
      workingHours: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!branch) return null;

  return {
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    workingHours: branch.workingHours.map((wh) => ({
      dayOfWeek: wh.dayOfWeek,
      isOpen: wh.isOpen,
      openTime: wh.openTime,
      closeTime: wh.closeTime,
    })),
  };
}

export async function getPublicBarbers(orgId: string) {
  const barbers = await prisma.barber.findMany({
    where: { active: true, branch: { orgId } },
    include: {
      user: { select: { name: true } },
      services: {
        include: {
          service: {
            include: { category: { select: { name: true } } },
          },
        },
      },
      barberSchedules: { orderBy: { dayOfWeek: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  return barbers.map((b) => ({
    id: b.id,
    name: b.user.name,
    color: b.color,
    workDays: b.barberSchedules
      .filter((s) => s.isWorking)
      .map((s) => s.dayOfWeek),
    services: b.services
      .filter((bs) => bs.service.active)
      .map((bs) => ({
        id: bs.service.id,
        name: bs.service.name,
        description: bs.service.description,
        durationMin: bs.customDuration ?? bs.service.durationMin,
        price: bs.customPrice ?? bs.service.price,
        categoryName: bs.service.category?.name ?? null,
      })),
  }));
}

export async function getPublicServices(orgId: string) {
  const services = await prisma.service.findMany({
    where: { active: true, orgId },
    include: { category: { select: { name: true } } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    durationMin: s.durationMin,
    price: s.price,
    categoryName: s.category?.name ?? null,
  }));
}
