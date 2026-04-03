import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/services/payment.service";
import { CreatePaymentSchema } from "@/lib/validations/payment";

export const POST = withAdmin(async (req, { orgId }) => {
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
    throw AppError.notFound("Cita no encontrada");
  }

  const payment = await createPayment(parsed.data);
  return NextResponse.json({ payment }, { status: 201 });
});
