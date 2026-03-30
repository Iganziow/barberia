import { NextResponse } from "next/server";
import { getBranches } from "@/lib/services/branch.service";
import { getOrgIdFromHeaders } from "@/lib/tenant";

export async function GET(req: Request) {
  try {
    const orgId = await getOrgIdFromHeaders(req);
    const branches = await getBranches(orgId);

    return NextResponse.json({
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
      })),
    });
  } catch (err) {
    console.error("GET /api/book/branches failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
