import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import {
  getBranchById,
  updateBranch,
  deleteBranch,
} from "@/lib/services/branch.service";
import { UpdateBranchSchema } from "@/lib/validations/branch";

export const PUT = withAdmin(async (req, { orgId }, { params }) => {
  const { id } = await params;

  const branch = await getBranchById(id, orgId);
  if (!branch) throw AppError.notFound("Sucursal no encontrada");

  const body = await req.json().catch(() => null);
  if (!body) throw AppError.badRequest("JSON inválido");

  const parsed = UpdateBranchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await updateBranch(id, orgId, parsed.data);
  return NextResponse.json({ branch: updated });
});

export const DELETE = withAdmin(async (_req, { orgId }, { params }) => {
  const { id } = await params;

  const branch = await getBranchById(id, orgId);
  if (!branch) throw AppError.notFound("Sucursal no encontrada");

  try {
    await deleteBranch(id);
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "No se pudo eliminar la sucursal";
    throw AppError.conflict(msg);
  }

  return NextResponse.json({ ok: true });
});
