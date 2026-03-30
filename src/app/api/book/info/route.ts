import { NextResponse } from "next/server";
import {
  getPublicBranchInfo,
  getPublicBarbers,
  getPublicServices,
} from "@/lib/services/public.service";
import { getOrgIdFromHeaders } from "@/lib/tenant";

export async function GET(req: Request) {
  try {
    const orgId = await getOrgIdFromHeaders(req);

    const [branch, barbers, services] = await Promise.all([
      getPublicBranchInfo(orgId),
      getPublicBarbers(orgId),
      getPublicServices(orgId),
    ]);

    return NextResponse.json({ branch, barbers, services });
  } catch (err) {
    console.error("GET /api/book/info failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
