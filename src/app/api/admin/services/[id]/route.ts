import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { updateService, deleteService } from "@/lib/services/service.service";
import { recordAudit } from "@/lib/audit-log";

export const PATCH = withAdmin(async (req, _ctx, { params }) => {
  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body) {
    throw AppError.badRequest("Datos inválidos");
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
});

export const DELETE = withAdmin(async (req, { userId, userEmail, userRole, orgId }, { params }) => {
  const { id } = await params;
  await deleteService(id);

  await recordAudit(req, { userId, userEmail, userRole, orgId }, {
    action: "service.delete",
    resource: "Service",
    resourceId: id,
  });

  return NextResponse.json({ ok: true });
});
