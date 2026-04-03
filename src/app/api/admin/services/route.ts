import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import {
  getAllServices,
  createService,
  getServiceCategories,
} from "@/lib/services/service.service";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  durationMin: z.number().int().min(5),
  price: z.number().int().min(0),
  categoryId: z.string().optional(),
});

export const GET = withAdmin(async (req, { orgId }) => {
  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("all") === "true";

  const [services, categories] = await Promise.all([
    getAllServices(orgId),
    getServiceCategories(orgId),
  ]);

  const filtered = includeInactive
    ? services
    : services.filter((s) => s.active);

  return NextResponse.json({
    services: filtered.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMin: s.durationMin,
      price: s.price,
      active: s.active,
      order: s.order,
      categoryId: s.categoryId,
      categoryName: s.category?.name ?? null,
    })),
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
  });
});

export const POST = withAdmin(async (req, { orgId }) => {
  const json = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const service = await createService({ ...parsed.data, orgId });

  return NextResponse.json({ service }, { status: 201 });
});
