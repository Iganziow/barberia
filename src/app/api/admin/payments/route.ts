import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/services/payment.service";
import { CreatePaymentSchema } from "@/lib/validations/payment";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
    const json = await req.json().catch(() => null);
    const parsed = CreatePaymentSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos inválidos.", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify appointment belongs to org
    const apt = await prisma.appointment.findFirst({
      where: { id: parsed.data.appointmentId, branch: { orgId } },
      select: { id: true },
    });
    if (!apt) {
      return NextResponse.json({ message: "Cita no encontrada" }, { status: 404 });
    }

    const payment = await createPayment(parsed.data);
    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("Unique")
        ? "Ya existe un pago para esta cita"
        : "Error al registrar pago";
    console.error("POST /api/admin/payments failed:", err);
    return NextResponse.json({ message }, { status: 400 });
  }
}
