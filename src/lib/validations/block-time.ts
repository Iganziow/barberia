import { z } from "zod";
import { stripHtml } from "@/lib/sanitize";

export const CreateBlockTimeSchema = z.object({
  reason: z.string().min(1).transform(stripHtml),
  start: z.string().datetime(),
  end: z.string().datetime(),
  allDay: z.boolean().optional().default(false),
  barberId: z.string().min(1),
}).refine(
  (data) => new Date(data.start) < new Date(data.end),
  { message: "La hora de fin debe ser posterior a la de inicio", path: ["end"] }
);

export type CreateBlockTimeInput = z.infer<typeof CreateBlockTimeSchema>;
