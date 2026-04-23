import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";

function escapeCSV(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * GET /api/admin/clients/export?q=<search>
 *
 * Exporta todos los clientes como CSV (con BOM UTF-8 para Excel).
 * Incluye: nombre, email, teléfono, total de citas, citas completadas,
 * total gastado en citas pagadas, última visita.
 *
 * No usa paginación — exporta todo el scope del org.
 */
export const GET = withAdmin(async (req, { orgId }) => {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || undefined;

  const clients = await prisma.client.findMany({
    where: {
      appointments: { some: { branch: { orgId } } },
      ...(query
        ? {
            user: {
              OR: [
                { name: { contains: query, mode: "insensitive" as const } },
                { email: { contains: query, mode: "insensitive" as const } },
                { phone: { contains: query } },
              ],
            },
          }
        : {}),
    },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      appointments: {
        where: { branch: { orgId } },
        select: {
          status: true,
          start: true,
          payment: { select: { amount: true } },
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  const lines: string[] = [];
  lines.push(
    ["Nombre", "Email", "Teléfono", "Citas", "Completadas", "Total gastado (CLP)", "Última visita"]
      .map(escapeCSV)
      .join(",")
  );

  for (const c of clients) {
    const done = c.appointments.filter((a) => a.status === "DONE");
    const totalSpent = done.reduce((s, a) => s + (a.payment?.amount ?? 0), 0);
    const last = done.sort((a, b) => b.start.getTime() - a.start.getTime())[0];
    const email = c.user.email && !c.user.email.includes("@placeholder") && !c.user.email.includes("@noemail")
      ? c.user.email
      : "";
    lines.push(
      [
        c.user.name,
        email,
        c.user.phone ?? "",
        String(c.appointments.length),
        String(done.length),
        String(totalSpent),
        last ? last.start.toISOString().slice(0, 10) : "",
      ]
        .map(escapeCSV)
        .join(",")
    );
  }

  const csv = "\uFEFF" + lines.join("\r\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
