import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { updateAppointmentStatus } from "@/lib/services/appointment.service";
import { UpdateStatusSchema } from "@/lib/validations/appointment";

export const PATCH = withAdmin(async (req, { orgId }, { params }) => {
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const parsed = UpdateStatusSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos.", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await updateAppointmentStatus(id, parsed.data, orgId);
  if (!updated) {
    throw AppError.notFound("Cita no encontrada");
  }

  return NextResponse.json({ appointment: updated });
});
