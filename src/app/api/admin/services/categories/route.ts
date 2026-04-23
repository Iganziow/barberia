import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/api-handler";
import {
  getServiceCategories,
  createServiceCategory,
} from "@/lib/services/service.service";

const CreateSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(80),
});

/**
 * GET  /api/admin/services/categories        — lista de categorías
 * POST /api/admin/services/categories        — crea categoría (nombre único se valida por UI)
 */
export const GET = withAdmin(async (_req, { orgId }) => {
  const categories = await getServiceCategories(orgId);
  return NextResponse.json({
    categories: categories.map((c) => ({ id: c.id, name: c.name, order: c.order })),
  });
});

export const POST = withAdmin(async (req, { orgId }) => {
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const category = await createServiceCategory({ name: parsed.data.name, orgId });
  return NextResponse.json({ category }, { status: 201 });
});
