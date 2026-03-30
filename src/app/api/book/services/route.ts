import { NextResponse } from "next/server";
import { getServices } from "@/lib/services/service.service";
import { getOrgIdFromHeaders } from "@/lib/tenant";

export async function GET(req: Request) {
  try {
    const orgId = await getOrgIdFromHeaders(req);
    const services = await getServices(orgId);

    return NextResponse.json({
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMin: s.durationMin,
        price: s.price,
        category: s.category?.name ?? null,
      })),
    });
  } catch (err) {
    console.error("GET /api/book/services failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
