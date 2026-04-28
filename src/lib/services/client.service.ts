import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { CreateClientInput } from "@/lib/validations/client";

/**
 * Scope: el cliente "pertenece" a la org si:
 *   a) Tiene al menos una cita en una sucursal de esa org, O
 *   b) Su User está vinculado directamente al org (caso típico de imports
 *      bulk donde aún no hay citas, o de altas manuales sin cita inmediata).
 *
 * Antes solo (a) → los clientes recién importados quedaban invisibles
 * hasta que reservaran su primera cita.
 */
const orgScope = (orgId: string) => ({
  OR: [
    { appointments: { some: { branch: { orgId } } } },
    { user: { orgId } },
  ],
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

export async function listClients(
  orgId: string,
  query?: string,
  opts: { skip?: number; take?: number } = {}
) {
  const take = Math.max(1, Math.min(200, opts.take ?? 100));
  const skip = Math.max(0, opts.skip ?? 0);

  const where = {
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
  };

  // Ventana 30 días para el stat "Nuevos"
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch en paralelo:
  // - clients: página actual con lastVisit (última cita DONE)
  // - total: count filtrado por query (para pagination)
  // - statsFullCount: count total sin filtro (stats muestran org entera)
  // - recurrentGroups: groupBy para computar cuántos clientes tienen >= 2 citas
  // - new30d: clientes cuyo user se creó en los últimos 30 días
  const [clients, total, statsFullCount, recurrentGroups, new30d] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        _count: { select: { appointments: true } },
        appointments: {
          where: { branch: { orgId } },
          orderBy: { start: "desc" },
          take: 1,
          select: { start: true, status: true },
        },
      },
      orderBy: { user: { name: "asc" } },
      skip,
      take,
    }),
    prisma.client.count({ where }),
    prisma.client.count({ where: orgScope(orgId) }),
    prisma.appointment.groupBy({
      by: ["clientId"],
      where: { branch: { orgId } },
      _count: { id: true },
    }),
    prisma.client.count({
      where: {
        ...orgScope(orgId),
        user: { createdAt: { gte: thirtyDaysAgo } },
      },
    }),
  ]);

  const recurrent = recurrentGroups.filter((g) => g._count.id >= 2).length;

  return {
    clients,
    total,
    skip,
    take,
    stats: {
      total: statsFullCount,
      recurrent,
      new30d,
    },
  };
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
        select: {
          id: true,
          start: true,
          end: true,
          status: true,
          price: true,
          noteInternal: true,
          service: { select: { name: true } },
          barber: { select: { user: { select: { name: true } } } },
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

export async function updateClient(
  id: string,
  orgId: string,
  data: { name?: string; email?: string | null; phone?: string | null; notes?: string | null }
) {
  // Verify client belongs to org (via any appointment's branch, or via User.orgId)
  const client = await prisma.client.findFirst({
    where: { id, user: { orgId } },
    include: { user: true },
  });
  if (!client) return null;

  return prisma.$transaction(async (tx) => {
    // Update User fields (name, email, phone) if provided
    if (data.name !== undefined || data.email !== undefined || data.phone !== undefined) {
      await tx.user.update({
        where: { id: client.userId },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.email !== undefined ? { email: data.email || `client.${Date.now()}@noemail.local` } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
        },
      });
    }
    // Update Client.notes if provided
    if (data.notes !== undefined) {
      await tx.client.update({
        where: { id },
        data: { notes: data.notes },
      });
    }
    return tx.client.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true, phone: true } } },
    });
  });
}
