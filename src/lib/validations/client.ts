import { z } from "zod";
import { personName } from "./_shared";

export const CreateClientSchema = z.object({
  name: personName(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(8).max(20).optional().or(z.literal("")),
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;
