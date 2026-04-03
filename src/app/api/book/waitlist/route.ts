import { NextResponse } from "next/server";
import { withPublic } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { getOrgIdFromHeaders } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { addToWaitlist } from "@/lib/services/waitlist.service";
import { CreateWaitlistSchema } from "@/lib/validations/waitlist";
import { rateLimit } from "@/lib/rate-limit";

export const POST = withPublic(async (req) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed } = rateLimit(ip, { maxRequests: 5, windowMs: 60_000 });
  if (!allowed) throw AppError.badRequest("Demasiadas solicitudes. Intenta en un minuto.");

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
    throw AppError.notFound("Sucursal no encontrada");
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
});
