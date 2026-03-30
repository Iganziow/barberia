import { z } from "zod";

export const CreatePaymentSchema = z.object({
  appointmentId: z.string().min(1),
  amount: z.number().int().nonnegative(),
  tip: z.number().int().nonnegative().optional().default(0),
  method: z.enum(["CASH", "DEBIT_CARD", "CREDIT_CARD", "TRANSFER", "OTHER"]),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
