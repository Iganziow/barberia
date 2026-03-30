import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getBranches } from "@/lib/services/branch.service";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
    const branches = await getBranches(orgId);

    return NextResponse.json({
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/branches failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
