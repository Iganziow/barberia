import { z } from "zod";
import { stripHtml } from "@/lib/sanitize";

export const CreateWaitlistSchema = z.object({
  clientName: z.string().min(2).max(200).transform(stripHtml),
  clientPhone: z.string().min(8).max(20).regex(/^\+?[\d\s\-().]+$/, "Teléfono inválido"),
  serviceId: z.string().min(1),
  barberId: z.string().optional().or(z.literal("")),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD requerido"),
  branchId: z.string().min(1),
});

export type CreateWaitlistInput = z.infer<typeof CreateWaitlistSchema>;
