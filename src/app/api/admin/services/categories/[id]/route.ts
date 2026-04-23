import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import {
  updateServiceCategory,
  deleteServiceCategory,
} from "@/lib/services/service.service";

const UpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  order: z.number().int().optional(),
});

/**
 * PATCH  /api/admin/services/categories/[id]  — renombra o reordena
 * DELETE /api/admin/services/categories/[id]  — borra y desvincula servicios
 */
export const PATCH = withAdmin(async (req, { orgId }, { params }) => {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const updated = await updateServiceCategory(id, orgId, parsed.data);
  if (!updated) throw AppError.notFound("Categoría no encontrada");
  return NextResponse.json({ category: updated });
});

export const DELETE = withAdmin(async (_req, { orgId }, { params }) => {
  const { id } = await params;
  const deleted = await deleteServiceCategory(id, orgId);
  if (!deleted) throw AppError.notFound("Categoría no encontrada");
  return NextResponse.json({ ok: true });
});
