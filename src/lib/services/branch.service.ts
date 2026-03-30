import { prisma } from "@/lib/prisma";

export async function getBranches(orgId: string) {
  return prisma.branch.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
  });
}
