import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { getBranches, createBranch } from "@/lib/services/branch.service";
import { CreateBranchSchema } from "@/lib/validations/branch";

export const GET = withAdmin(async (_req, { orgId }) => {
  const branches = await getBranches(orgId);

  return NextResponse.json({
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      phone: b.phone,
      latitude: b.latitude,
      longitude: b.longitude,
    })),
  });
});

export const POST = withAdmin(async (req, { orgId }) => {
  const body = await req.json().catch(() => null);
  if (!body) throw AppError.badRequest("JSON inválido");

  const parsed = CreateBranchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const branch = await createBranch(orgId, parsed.data);
  return NextResponse.json({ branch }, { status: 201 });
});
