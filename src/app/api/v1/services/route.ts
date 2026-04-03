import { NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";

export const GET = withApiKey(async (_req, { orgId }) => {
  const services = await prisma.service.findMany({
    where: { orgId, active: true },
    select: {
      id: true,
      name: true,
      description: true,
      durationMin: true,
      price: true,
      category: { select: { name: true } },
    },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMin: s.durationMin,
      price: s.price,
      category: s.category?.name ?? null,
    })),
  });
});
