import { NextResponse } from "next/server";
import { getOrgIdFromHeaders } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { addToWaitlist } from "@/lib/services/waitlist.service";
import { CreateWaitlistSchema } from "@/lib/validations/waitlist";

export async function POST(req: Request) {
  try {
    const orgId = await getOrgIdFromHeaders(req);

    const json = await req.json().catch(() => null);
    const parsed = CreateWaitlistSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify branch belongs to org
    const branch = await prisma.branch.findFirst({
      where: { id: parsed.data.branchId, orgId },
      select: { id: true },
    });
    if (!branch) {
      return NextResponse.json({ message: "Sucursal no encontrada" }, { status: 404 });
    }

    const result = await addToWaitlist(parsed.data);

    return NextResponse.json({
      id: result.id,
      position: result.position,
      alreadyExists: result.alreadyExists,
      message: result.alreadyExists
        ? `Ya estás en la lista de espera (posición #${result.position})`
        : `Te anotamos en la lista de espera (posición #${result.position})`,
    }, { status: result.alreadyExists ? 200 : 201 });
  } catch (err) {
    console.error("POST /api/book/waitlist failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
