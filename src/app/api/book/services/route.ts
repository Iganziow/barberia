import { NextResponse } from "next/server";
import { withPublic } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { getOrgIdFromHeaders } from "@/lib/tenant";

/**
 * Endpoint público de servicios — devuelve los servicios que se pueden
 * reservar EFECTIVAMENTE: activos + ofrecidos por al menos un barbero
 * activo. Esto evita que el cliente elija un servicio sin barbero
 * disponible y vea la pantalla "No hay disponibilidad" sin entender por qué.
 */
export const GET = withPublic(async (req) => {
  const orgId = await getOrgIdFromHeaders(req);

  const services = await prisma.service.findMany({
    where: {
      active: true,
      orgId,
      barbers: { some: { barber: { active: true } } },
    },
    include: { category: { select: { name: true } } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      durationMin: s.durationMin,
      price: s.price,
      category: s.category?.name ?? null,
    })),
  });
});
