import { NextResponse } from "next/server";
import { requireBarber } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const StatusSchema = z.object({
  status: z.enum(["DONE", "NO_SHOW", "RESERVED"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBarber();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const userId = auth.payload.sub;

    const barber = await prisma.barber.findUnique({ where: { userId } });
    if (!barber) {
      return NextResponse.json({ message: "Barbero no encontrado" }, { status: 404 });
    }

    // Verify appointment belongs to this barber
    const appointment = await prisma.appointment.findFirst({
      where: { id, barberId: barber.id },
    });
    if (!appointment) {
      return NextResponse.json({ message: "Cita no encontrada" }, { status: 404 });
    }

    const json = await req.json().catch(() => null);
    const parsed = StatusSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Datos inválidos" }, { status: 400 });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: parsed.data.status },
      select: { id: true, status: true },
    });

    return NextResponse.json({ appointment: updated });
  } catch (err) {
    console.error("PATCH /api/barber/appointments/[id]/status failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
