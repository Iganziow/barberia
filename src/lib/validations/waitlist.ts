import { z } from "zod";
import { personName } from "./_shared";

export const CreateWaitlistSchema = z.object({
  clientName: personName(),
  clientPhone: z.string().min(8).max(20).regex(/^\+?[\d\s\-().]+$/, "Teléfono inválido"),
  serviceId: z.string().min(1),
  barberId: z.string().optional().or(z.literal("")),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD requerido"),
  branchId: z.string().min(1),
});

export type CreateWaitlistInput = z.infer<typeof CreateWaitlistSchema>;
