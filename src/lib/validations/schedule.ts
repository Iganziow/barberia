import { z } from "zod";

const timeRegex = /^\d{2}:\d{2}$/;

const WorkingHourEntry = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(timeRegex, "Formato HH:MM requerido"),
  closeTime: z.string().regex(timeRegex, "Formato HH:MM requerido"),
  isOpen: z.boolean(),
});

export const UpdateBranchHoursSchema = z.object({
  branchId: z.string().min(1),
  hours: z.array(WorkingHourEntry).min(1).max(7),
});

const BarberScheduleEntry = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(timeRegex, "Formato HH:MM requerido"),
  endTime: z.string().regex(timeRegex, "Formato HH:MM requerido"),
  isWorking: z.boolean(),
});

export const UpdateBarberScheduleSchema = z.object({
  schedule: z.array(BarberScheduleEntry).min(1).max(7),
});
