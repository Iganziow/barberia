import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const GET = withAdmin(async (_req, { orgId }, { params }) => {
  const { id } = await params;

  const barber = await prisma.barber.findFirst({
    where: { id, branch: { orgId } },
    select: { id: true },
  });
  if (!barber) {
    throw AppError.notFound("Barbero no encontrado");
  }

  const barberServices = await prisma.barberService.findMany({
    where: { barberId: id },
    include: {
      service: { select: { id: true, name: true, durationMin: true, price: true, active: true } },
    },
  });

  return NextResponse.json({
    services: barberServices.map((bs) => ({
      serviceId: bs.serviceId,
      serviceName: bs.service.name,
      serviceActive: bs.service.active,
      defaultPrice: bs.service.price,
      defaultDuration: bs.service.durationMin,
      customPrice: bs.customPrice,
      customDuration: bs.customDuration,
    })),
  });
});

export const PUT = withAdmin(async (req, { orgId }, { params }) => {
  const { id } = await params;

  const barber = await prisma.barber.findFirst({
    where: { id, branch: { orgId } },
    select: { id: true },
  });
  if (!barber) {
    throw AppError.notFound("Barbero no encontrado");
  }

  const body = await req.json().catch(() => null);

  if (!body?.services || !Array.isArray(body.services)) {
    throw AppError.badRequest("Se requiere array de services");
  }

  await prisma.$transaction([
    prisma.barberService.deleteMany({ where: { barberId: id } }),
    prisma.barberService.createMany({
      data: body.services.map((s: { serviceId: string; customPrice?: number; customDuration?: number }) => ({
        barberId: id,
        serviceId: s.serviceId,
        customPrice: s.customPrice ?? null,
        customDuration: s.customDuration ?? null,
      })),
    }),
  ]);

  return NextResponse.json({ ok: true });
});
