import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET barber's assigned services
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

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
  } catch (err) {
    console.error("GET /api/admin/barbers/[id]/services failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

// PUT — replace all barber-service assignments
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);

    if (!body?.services || !Array.isArray(body.services)) {
      return NextResponse.json({ message: "Se requiere array de services" }, { status: 400 });
    }

    // Delete all existing and recreate
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
  } catch (err) {
    console.error("PUT /api/admin/barbers/[id]/services failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
