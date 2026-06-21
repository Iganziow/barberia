import { z } from "zod";
import { stripHtml } from "@/lib/sanitize";
import { personName } from "./_shared";

export const CreateBranchSchema = z.object({
  // min: 1 — sucursales pueden tener nombres muy cortos (ej. "A"). El personName
  // helper default es min 2, así que pasamos override.
  name: personName({ min: 1 }),
  address: z.string().transform(stripHtml).optional(),
  phone: z.string().transform(stripHtml).optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

export type CreateBranchInput = z.infer<typeof CreateBranchSchema>;

export const UpdateBranchSchema = CreateBranchSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Al menos un campo debe ser actualizado" }
);

export type UpdateBranchInput = z.infer<typeof UpdateBranchSchema>;
