import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
    const { id } = await params;

    // Verify payment belongs to org via appointment → branch
    const payment = await prisma.payment.findFirst({
      where: { id, appointment: { branch: { orgId } } },
    });
    if (!payment) {
      return NextResponse.json({ message: "Pago no encontrado" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Datos inválidos" }, { status: 400 });
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        ...(body.amount !== undefined ? { amount: Number(body.amount) } : {}),
        ...(body.method ? { method: body.method } : {}),
      },
    });

    return NextResponse.json({ payment: updated });
  } catch (err) {
    console.error("PATCH /api/admin/payments/[id] failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
