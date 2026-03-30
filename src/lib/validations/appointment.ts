import { z } from "zod";
import { stripHtml } from "@/lib/sanitize";

export const CreateAppointmentSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  barberId: z.string().min(1),
  serviceId: z.string().min(1),
  clientId: z.string().min(1),
  branchId: z.string().min(1),
  price: z.number().int().nonnegative(),
  notePublic: z.string().transform(stripHtml).optional(),
  noteInternal: z.string().transform(stripHtml).optional(),
}).refine(
  (data) => new Date(data.start) < new Date(data.end),
  { message: "La hora de inicio debe ser anterior a la hora de fin", path: ["start"] }
);

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

export const UpdateStatusSchema = z.object({
  status: z.enum([
    "RESERVED",
    "CONFIRMED",
    "ARRIVED",
    "IN_PROGRESS",
    "DONE",
    "CANCELED",
    "NO_SHOW",
  ]),
  cancelReason: z.string().transform(stripHtml).optional(),
});

export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
