import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { updateService, deleteService } from "@/lib/services/service.service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ message: "Datos inválidos" }, { status: 400 });
    }

    const service = await updateService(id, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.durationMin !== undefined ? { durationMin: Number(body.durationMin) } : {}),
      ...(body.price !== undefined ? { price: Number(body.price) } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
      ...(body.order !== undefined ? { order: Number(body.order) } : {}),
      ...(body.categoryId !== undefined ? { categoryId: body.categoryId || null } : {}),
    });

    return NextResponse.json({ service });
  } catch (err) {
    console.error("PATCH /api/admin/services/[id] failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    await deleteService(id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/services/[id] failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
