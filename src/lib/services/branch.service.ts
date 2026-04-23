import { prisma } from "@/lib/prisma";
import type { CreateBranchInput, UpdateBranchInput } from "@/lib/validations/branch";

export async function getBranches(orgId: string) {
  // Inicio del mes actual para el count de citas — criterio más útil que "todas"
  // (sucursal con 10k citas históricas no es interesante, sí lo es "48 este mes").
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const branches = await prisma.branch.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          barbers: true,
          appointments: { where: { start: { gte: monthStart } } },
        },
      },
    },
  });
  return branches;
}

export async function getBranchById(id: string, orgId: string) {
  return prisma.branch.findFirst({
    where: { id, orgId },
  });
}

export async function createBranch(orgId: string, data: CreateBranchInput) {
  return prisma.branch.create({
    data: {
      name: data.name,
      address: data.address || null,
      phone: data.phone || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      orgId,
    },
  });
}

export async function updateBranch(
  id: string,
  orgId: string,
  data: UpdateBranchInput
) {
  return prisma.branch.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.address !== undefined && { address: data.address || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.latitude !== undefined && { latitude: data.latitude ?? null }),
      ...(data.longitude !== undefined && {
        longitude: data.longitude ?? null,
      }),
    },
  });
}

export async function deleteBranch(id: string) {
  // Verificar que no tenga barberos asociados antes de eliminar
  const barberCount = await prisma.barber.count({ where: { branchId: id } });
  if (barberCount > 0) {
    throw new Error(
      `No se puede eliminar: tiene ${barberCount} barbero(s) asociados`
    );
  }
  return prisma.branch.delete({ where: { id } });
}
