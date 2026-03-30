import { NextResponse } from "next/server";
import { requireBarber } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBarber();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const userId = auth.payload.sub;

    const barber = await prisma.barber.findUnique({ where: { userId } });
    if (!barber) return NextResponse.json({ message: "Barbero no encontrado" }, { status: 404 });

    // Verify block belongs to this barber
    const block = await prisma.blockTime.findFirst({
      where: { id, barberId: barber.id },
    });
    if (!block) return NextResponse.json({ message: "Bloqueo no encontrado" }, { status: 404 });

    await prisma.blockTime.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/barber/block-times/[id] failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
