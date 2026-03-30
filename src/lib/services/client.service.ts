import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { CreateClientInput } from "@/lib/validations/client";

const orgScope = (orgId: string) => ({
  appointments: { some: { branch: { orgId } } },
});

export async function searchClients(query: string, orgId: string) {
  if (!query || query.length < 2) return [];

  return prisma.client.findMany({
    where: {
      ...orgScope(orgId),
      user: {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
          { phone: { contains: query } },
        ],
      },
    },
    include: {
      user: { select: { name: true, email: true, phone: true } },
    },
    take: 10,
    orderBy: { user: { name: "asc" } },
  });
}

export async function listClients(orgId: string, query?: string) {
  return prisma.client.findMany({
    where: {
      ...orgScope(orgId),
      ...(query
        ? {
            user: {
              OR: [
                { name: { contains: query, mode: "insensitive" as const } },
                { email: { contains: query, mode: "insensitive" as const } },
                { phone: { contains: query } },
              ],
            },
          }
        : {}),
    },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      _count: { select: { appointments: true } },
    },
    orderBy: { user: { name: "asc" } },
  });
}

export async function getClientDetail(id: string, orgId: string) {
  // Only return client if they have at least one appointment in this org
  const client = await prisma.client.findFirst({
    where: {
      id,
      appointments: { some: { branch: { orgId } } },
    },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      appointments: {
        where: { branch: { orgId } },
        include: {
          service: { select: { name: true } },
          barber: { include: { user: { select: { name: true } } } },
          payment: { select: { amount: true, tip: true, method: true } },
        },
        orderBy: { start: "desc" },
        take: 50,
      },
    },
  });

  if (!client) return null;

  const totalVisits = client.appointments.filter((a) => a.status === "DONE").length;
  const totalSpent = client.appointments
    .filter((a) => a.payment)
    .reduce((sum, a) => sum + (a.payment?.amount ?? 0), 0);
  const lastVisit = client.appointments.find((a) => a.status === "DONE");

  return {
    ...client,
    stats: {
      totalVisits,
      totalSpent,
      lastVisitDate: lastVisit?.start.toISOString() ?? null,
    },
  };
}

export async function createClient(data: CreateClientInput) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email || `client.${Date.now()}@noemail.local`,
        phone: data.phone || null,
        password: randomBytes(32).toString("hex"),
        role: "CLIENT",
      },
    });

    const client = await tx.client.create({
      data: { userId: user.id },
    });

    return { id: client.id, userId: user.id, name: user.name, email: user.email, phone: user.phone };
  });
}

export async function getClientById(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
    },
  });
}
