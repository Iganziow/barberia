import { prisma } from "@/lib/prisma";
import type { CreatePaymentInput } from "@/lib/validations/payment";

export async function createPayment(data: CreatePaymentInput) {
  return prisma.payment.create({
    data: {
      appointmentId: data.appointmentId,
      amount: data.amount,
      tip: data.tip ?? 0,
      method: data.method,
      status: "PAID",
      paidAt: new Date(),
    },
  });
}
