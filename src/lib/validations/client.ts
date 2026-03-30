import { z } from "zod";
import { stripHtml } from "@/lib/sanitize";

export const CreateClientSchema = z.object({
  name: z.string().min(2).max(200).transform(stripHtml),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(8).max(20).optional().or(z.literal("")),
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;
