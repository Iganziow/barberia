import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import {
  getBlockTimes,
  createBlockTime,
} from "@/lib/services/block-time.service";
import { CreateBlockTimeSchema } from "@/lib/validations/block-time";

export const GET = withAdmin(async (req, { orgId }) => {
  const { searchParams } = new URL(req.url);

  const blocks = await getBlockTimes({
    orgId,
    barberId: searchParams.get("barberId") || undefined,
    from: searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : undefined,
    to: searchParams.get("to")
      ? new Date(searchParams.get("to")!)
      : undefined,
  });

  return NextResponse.json({
    blockTimes: blocks.map((b) => ({
      id: b.id,
      reason: b.reason,
      start: b.start.toISOString(),
      end: b.end.toISOString(),
      allDay: b.allDay,
      barberId: b.barberId,
      barberName: b.barber.user.name,
    })),
  });
});

export const POST = withAdmin(async (req, { orgId }) => {
  const json = await req.json().catch(() => null);
  const parsed = CreateBlockTimeSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos.", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify barber belongs to org
  const barber = await prisma.barber.findFirst({
    where: { id: parsed.data.barberId, branch: { orgId } },
    select: { id: true },
  });
  if (!barber) {
    throw AppError.notFound("Barbero no encontrado");
  }

  const block = await createBlockTime(parsed.data);

  return NextResponse.json({ blockTime: block }, { status: 201 });
});
