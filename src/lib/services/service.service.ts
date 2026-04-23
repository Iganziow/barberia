import { prisma } from "@/lib/prisma";

export async function getServices(orgId: string) {
  return prisma.service.findMany({
    where: { active: true, orgId },
    include: {
      category: { select: { name: true } },
    },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
}

export async function getServiceById(id: string) {
  return prisma.service.findUnique({
    where: { id },
    include: { category: { select: { name: true } } },
  });
}

export async function getAllServices(orgId: string) {
  return prisma.service.findMany({
    where: { orgId },
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
}

export async function createService(data: {
  name: string;
  description?: string;
  durationMin: number;
  price: number;
  categoryId?: string;
  orgId: string;
}) {
  return prisma.service.create({ data });
}

export async function updateService(
  id: string,
  data: {
    name?: string;
    description?: string;
    durationMin?: number;
    price?: number;
    active?: boolean;
    order?: number;
    categoryId?: string | null;
  }
) {
  return prisma.service.update({ where: { id }, data });
}

export async function deleteService(id: string) {
  return prisma.service.update({
    where: { id },
    data: { active: false },
  });
}

export async function getServiceCategories(orgId: string) {
  return prisma.serviceCategory.findMany({
    where: { orgId },
    orderBy: { order: "asc" },
  });
}

export async function createServiceCategory(data: { name: string; orgId: string }) {
  // Calcula el próximo orden
  const last = await prisma.serviceCategory.findFirst({
    where: { orgId: data.orgId },
    orderBy: { order: "desc" },
  });
  return prisma.serviceCategory.create({
    data: { name: data.name, orgId: data.orgId, order: (last?.order ?? 0) + 1 },
  });
}

export async function updateServiceCategory(
  id: string,
  orgId: string,
  data: { name?: string; order?: number }
) {
  // Scope por org: asegura que no se pueda editar una categoría de otra org
  const existing = await prisma.serviceCategory.findFirst({ where: { id, orgId } });
  if (!existing) return null;
  return prisma.serviceCategory.update({ where: { id }, data });
}

export async function deleteServiceCategory(id: string, orgId: string) {
  const existing = await prisma.serviceCategory.findFirst({ where: { id, orgId } });
  if (!existing) return null;
  // Desvincular servicios antes de borrar (categoryId = null)
  await prisma.service.updateMany({
    where: { categoryId: id, orgId },
    data: { categoryId: null },
  });
  return prisma.serviceCategory.delete({ where: { id } });
}
