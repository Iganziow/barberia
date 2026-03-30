import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { updateAppointmentStatus } from "@/lib/services/appointment.service";
import { UpdateStatusSchema } from "@/lib/validations/appointment";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
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
      return NextResponse.json({ message: "Cita no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ appointment: updated });
  } catch (err) {
    console.error("PATCH /api/admin/appointments/[id]/status failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
