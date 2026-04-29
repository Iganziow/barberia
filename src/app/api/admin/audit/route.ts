import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";

/**
 * Lista el audit log de la org. Filtros por action/userId/fecha + paginación.
 *
 * Query params:
 *   action    - filtra por acción específica (ej "barber.delete")
 *   userId    - filtra por usuario
 *   limit     - máx 200, default 50
 *   cursor    - cursor de paginación (id del último item visto)
 */
export const GET = withAdmin(async (req, { orgId }) => {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || undefined;
  const userId = searchParams.get("userId") || undefined;
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || "50")));
  const cursor = searchParams.get("cursor") || undefined;

  const logs = await prisma.auditLog.findMany({
    where: {
      orgId,
      ...(action ? { action } : {}),
      ...(userId ? { userId } : {}),
    },
    take: limit + 1, // +1 para saber si hay más página
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
  });

  const hasMore = logs.length > limit;
  const items = hasMore ? logs.slice(0, limit) : logs;

  return NextResponse.json({
    items: items.map((l) => ({
      id: l.id,
      userId: l.userId,
      userEmail: l.userEmail,
      userRole: l.userRole,
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId,
      metadata: l.metadata,
      ip: l.ip,
      userAgent: l.userAgent,
      createdAt: l.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
});
