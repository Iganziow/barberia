import { z } from "zod";
import { stripHtml } from "@/lib/sanitize";

export const CreateBranchSchema = z.object({
  name: z.string().min(1, "Nombre requerido").transform(stripHtml),
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
