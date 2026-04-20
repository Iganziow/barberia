import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import {
  getDashboardStats,
  getBarberStats,
  getServiceStats,
  getDailyRevenue,
} from "@/lib/services/report.service";
import { formatCLP } from "@/lib/format";

function escapeCSV(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function periodLabel(period: string): string {
  switch (period) {
    case "today": return "Hoy";
    case "week": return "Esta semana";
    case "month": return "Este mes";
    case "year": return "Este año";
    default: return period;
  }
}

/**
 * GET /api/admin/reports/export?period=month&branchId=...
 * Exporta un reporte consolidado en CSV con:
 * - Resumen (KPIs)
 * - Ingresos diarios
 * - Desempeño por barbero
 * - Servicios más vendidos
 */
export const GET = withAdmin(async (req, { orgId }) => {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "month";
  const branchId = searchParams.get("branchId") || undefined;

  const [dashboard, barberStats, serviceStats, dailyRevenue] = await Promise.all([
    getDashboardStats(period, orgId, branchId),
    getBarberStats(period, orgId, branchId),
    getServiceStats(period, orgId, branchId),
    getDailyRevenue(period, orgId, branchId),
  ]);

  const lines: string[] = [];

  // Header general
  lines.push(`Reporte MarBrava,${periodLabel(period)},Generado,${new Date().toLocaleString("es-CL")}`);
  lines.push("");

  // Sección: Resumen
  lines.push("RESUMEN");
  lines.push(["Métrica", "Valor"].map(escapeCSV).join(","));
  lines.push(["Ingresos totales", formatCLP(dashboard.revenue.total)].map(escapeCSV).join(","));
  lines.push(["Ingresos cobrados", formatCLP(dashboard.revenue.paid)].map(escapeCSV).join(","));
  lines.push(["Ingresos pendientes", formatCLP(dashboard.revenue.pending)].map(escapeCSV).join(","));
  lines.push(["Total citas", String(dashboard.appointments.total)].map(escapeCSV).join(","));
  lines.push(["Citas completadas", String(dashboard.appointments.completed)].map(escapeCSV).join(","));
  lines.push(["Citas canceladas", String(dashboard.appointments.canceled)].map(escapeCSV).join(","));
  lines.push(["No shows", String(dashboard.appointments.noShow)].map(escapeCSV).join(","));
  lines.push("");

  // Sección: Ingresos diarios
  lines.push("INGRESOS DIARIOS");
  lines.push(["Fecha", "Ingreso"].map(escapeCSV).join(","));
  for (const d of dailyRevenue) {
    lines.push([d.date, formatCLP(d.revenue)].map(escapeCSV).join(","));
  }
  lines.push("");

  // Sección: Desempeño por barbero
  lines.push("DESEMPEÑO POR BARBERO");
  lines.push(
    ["Barbero", "Citas totales", "Completadas", "Ingresos", "Ticket promedio"]
      .map(escapeCSV)
      .join(",")
  );
  for (const b of barberStats) {
    lines.push(
      [
        b.name,
        String(b.appointments),
        String(b.completed),
        formatCLP(b.revenue),
        formatCLP(
          b.completed > 0 ? Math.round(b.revenue / b.completed) : 0
        ),
      ]
        .map(escapeCSV)
        .join(",")
    );
  }
  lines.push("");

  // Sección: Servicios
  lines.push("SERVICIOS");
  lines.push(["Servicio", "Ventas", "Ingresos"].map(escapeCSV).join(","));
  for (const s of serviceStats) {
    lines.push(
      [s.name, String(s.count), formatCLP(s.revenue)].map(escapeCSV).join(",")
    );
  }

  const csv = "\uFEFF" + lines.join("\r\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-${period}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
});
