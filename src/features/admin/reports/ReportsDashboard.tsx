"use client";

import { useCallback, useEffect, useState } from "react";
import PageTip from "@/components/ui/PageTip";
import InfoTip from "@/components/ui/InfoTip";
import { formatCLP } from "@/lib/format";

type CommissionRow = {
  id: string;
  name: string;
  commissionType: "PERCENTAGE" | "FIXED";
  commissionValue: number;
  completed: number;
  revenue: number;
  commission: number;
};

type DashboardData = {
  dashboard: {
    period: string;
    from: string;
    to: string;
    appointments: {
      total: number;
      completed: number;
      canceled: number;
      noShow: number;
      reserved: number;
    };
    revenue: {
      total: number;
      paid: number;
      pending: number;
    };
  };
  barbers: Array<{
    id: string;
    name: string;
    color: string | null;
    appointments: number;
    completed: number;
    revenue: number;
  }>;
  services: Array<{
    id: string;
    name: string;
    count: number;
    revenue: number;
  }>;
  dailyRevenue: Array<{ date: string; revenue: number }>;
};

const PERIODS = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "year", label: "Año" },
];

const TABS = [
  { value: "dashboard", label: "Resumen" },
  { value: "commissions", label: "Liquidaciones" },
];

function StatCard({
  label,
  value,
  sub,
  borderColor,
}: {
  label: string;
  value: string;
  sub?: string;
  borderColor: string;
}) {
  return (
    <div
      className="relative rounded-xl border border-[#e8e2dc] bg-white p-4 shadow-sm overflow-hidden group hover:shadow-md transition-all"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
    >
      {/* Subtle gradient wash on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top right, ${borderColor}08, transparent 70%)`,
        }}
      />
      <div className="relative">
        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.1em]">{label}</p>
        <p className="text-[28px] leading-none font-extrabold text-stone-900 mt-2 tracking-tight tabular-nums">
          {value}
        </p>
        {sub && <p className="text-xs text-stone-500 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

function BarChart({
  data,
  maxValue,
}: {
  data: Array<{ label: string; value: number; color?: string | null }>;
  maxValue: number;
}) {
  if (data.length === 0) return <p className="text-sm text-stone-400">Sin datos</p>;
  const safeMax = maxValue > 0 ? maxValue : 1;
  return (
    <div className="space-y-2.5">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-20 sm:w-28 text-xs sm:text-sm text-stone-600 truncate" title={item.label}>{item.label}</span>
          <div className="flex-1 h-6 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max((item.value / safeMax) * 100, 2)}%`,
                backgroundColor: item.color || "#c87941",
              }}
            />
          </div>
          <span className="w-20 text-right text-sm font-medium text-stone-700">
            {formatCLP(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState<DashboardData | null>(null);
  const [commissions, setCommissions] = useState<CommissionRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    if (activeTab === "commissions") {
      fetch(`/api/admin/reports?period=${period}&type=commissions`)
        .then((r) => r.json())
        .then((d) => setCommissions(d.commissions || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      fetch(`/api/admin/reports?period=${period}`)
        .then((r) => r.json())
        .then((d) => setData(d))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [period, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const d = data?.dashboard;
  const maxBarberRevenue = Math.max(...(data?.barbers?.map((b) => b.revenue) || [0]));
  const maxServiceRevenue = Math.max(...(data?.services?.map((s) => s.revenue) || [0]));

  function exportCommissionsCSV() {
    if (!commissions) return;
    const header = "Barbero,Citas completadas,Ingresos,Tipo comisión,Valor,A pagar";
    const rows = commissions.map((c) =>
      [
        c.name,
        c.completed,
        c.revenue,
        c.commissionType === "PERCENTAGE" ? "Porcentaje" : "Fijo",
        c.commissionValue,
        c.commission,
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liquidaciones-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Reportes</h1>
          <p className="text-sm text-stone-500">Ingresos, citas y liquidaciones de tu barbería</p>
          <div className="flex gap-1 mt-2 border-b border-[#e8e2dc] items-center">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => { setLoading(true); setActiveTab(t.value); }}
                className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
                  activeTab === t.value
                    ? "border-brand text-brand"
                    : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                {t.label}
              </button>
            ))}
            <InfoTip text="Liquidaciones muestra cuánto debes pagarle a cada barbero según las citas completadas en el período." />
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto print:hidden">
          <div className="flex gap-1 rounded-lg border border-[#e8e2dc] bg-white p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => { setLoading(true); setPeriod(p.value); }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  period === p.value
                    ? "bg-brand text-white shadow-sm"
                    : "text-stone-500 hover:bg-stone-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Acciones: export + print */}
          <a
            href={`/api/admin/reports/export?period=${period}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#e8e2dc] bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-brand/40 hover:text-brand transition"
            title="Descargar reporte CSV"
          >
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 3a1 1 0 011 1v8.59l2.3-2.3a1 1 0 011.4 1.42l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.42l2.3 2.3V4a1 1 0 011-1zM4 16a1 1 0 012 0v1h8v-1a1 1 0 112 0v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z" />
            </svg>
            CSV
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#e8e2dc] bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-brand/40 hover:text-brand transition"
            title="Imprimir o guardar como PDF"
          >
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6 2v4h8V2H6zm9 6H5a2 2 0 00-2 2v5h2v3h10v-3h2v-5a2 2 0 00-2-2zm-2 8H7v-4h6v4z" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      <PageTip id="reportes" text="Los datos se generan automáticamente a partir de las citas y pagos registrados. Usa las pestañas para ver el resumen general o las liquidaciones por barbero." />

      {loading ? (
        <div className="text-center text-stone-400 py-12">Cargando reportes...</div>
      ) : activeTab === "commissions" ? (
        /* ── Liquidaciones tab ── */
        <div className="rounded-xl border border-[#e8e2dc] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-stone-900">Liquidaciones de barberos</h2>
            {commissions && commissions.length > 0 && (
              <button
                onClick={exportCommissionsCSV}
                className="rounded-lg border border-[#e8e2dc] px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition"
              >
                Exportar CSV
              </button>
            )}
          </div>
          {!commissions || commissions.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">No hay datos para este período</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e8e2dc] text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                      <th className="pb-3 pr-4">Barbero</th>
                      <th className="pb-3 pr-4 text-right">Citas</th>
                      <th className="pb-3 pr-4 text-right">Ingresos</th>
                      <th className="pb-3 pr-4 text-right">Comisión</th>
                      <th className="pb-3 text-right font-bold text-stone-600">A pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c) => (
                      <tr key={c.id} className="border-b border-[#e8e2dc] last:border-0">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-stone-800">{c.name}</p>
                          <p className="text-[11px] text-stone-400">
                            {c.commissionType === "PERCENTAGE"
                              ? `${c.commissionValue}%`
                              : `${formatCLP(c.commissionValue)} fijo/cita`}
                          </p>
                        </td>
                        <td className="py-3 pr-4 text-right text-stone-600">{c.completed}</td>
                        <td className="py-3 pr-4 text-right text-stone-600">{formatCLP(c.revenue)}</td>
                        <td className="py-3 pr-4 text-right text-stone-400 text-xs">
                          {c.commissionType === "PERCENTAGE"
                            ? `${c.commissionValue}% × ${formatCLP(c.revenue)}`
                            : `${formatCLP(c.commissionValue)} × ${c.completed} citas`}
                        </td>
                        <td className="py-3 text-right font-bold text-stone-900">{formatCLP(c.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#e8e2dc]">
                      <td className="pt-3 font-semibold text-stone-700">Total</td>
                      <td className="pt-3 text-right font-semibold text-stone-700">
                        {commissions.reduce((s, c) => s + c.completed, 0)}
                      </td>
                      <td className="pt-3 text-right font-semibold text-stone-700">
                        {formatCLP(commissions.reduce((s, c) => s + c.revenue, 0))}
                      </td>
                      <td />
                      <td className="pt-3 text-right font-bold text-brand text-base">
                        {formatCLP(commissions.reduce((s, c) => s + c.commission, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      ) : !d ? (
        <div className="text-center text-stone-400 py-12">Error al cargar datos</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Ingresos" value={formatCLP(d.revenue.total)} sub={`${formatCLP(d.revenue.paid)} cobrado`} borderColor="#22c55e" />
            <StatCard label="Por cobrar" value={formatCLP(d.revenue.pending)} borderColor="#f59e0b" />
            <StatCard label="Citas totales" value={String(d.appointments.total)} sub={`${d.appointments.completed} completadas`} borderColor="#c87941" />
            <StatCard label="Cancelaciones" value={String(d.appointments.canceled + d.appointments.noShow)} sub={`${d.appointments.canceled} canceladas, ${d.appointments.noShow} no show`} borderColor="#ef4444" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-xl border border-[#e8e2dc] bg-white p-5 shadow-sm">
              <h2 className="font-bold text-stone-900 mb-4">Ingresos por barbero</h2>
              <BarChart data={(data?.barbers || []).map((b) => ({ label: b.name, value: b.revenue, color: b.color }))} maxValue={maxBarberRevenue} />
              {(data?.barbers || []).length > 0 && (
                <div className="mt-4 border-t border-[#e8e2dc] pt-3 space-y-1">
                  {(data?.barbers || []).map((b) => (
                    <div key={b.id} className="flex justify-between text-sm">
                      <span className="text-stone-500">{b.name}: {b.appointments} citas ({b.completed} completadas)</span>
                      <span className="font-medium text-stone-700">{formatCLP(b.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#e8e2dc] bg-white p-5 shadow-sm">
              <h2 className="font-bold text-stone-900 mb-4">Servicios más solicitados</h2>
              <BarChart data={(data?.services || []).map((s) => ({ label: s.name, value: s.revenue }))} maxValue={maxServiceRevenue} />
              {(data?.services || []).length > 0 && (
                <div className="mt-4 border-t border-[#e8e2dc] pt-3 space-y-1">
                  {(data?.services || []).map((s) => (
                    <div key={s.id} className="flex justify-between text-sm">
                      <span className="text-stone-500">{s.name}: {s.count} citas</span>
                      <span className="font-medium text-stone-700">{formatCLP(s.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Daily Revenue */}
          {(data?.dailyRevenue || []).length > 0 && (
            <div className="rounded-xl border border-[#e8e2dc] bg-white p-5 shadow-sm">
              <h2 className="font-bold text-stone-900 mb-4">Ingresos diarios</h2>
              <div className="flex items-end gap-1 h-40">
                {(data?.dailyRevenue || []).map((day) => {
                  const maxDayRevenue = Math.max(...(data?.dailyRevenue || []).map((d) => d.revenue), 1);
                  const height = Math.max((day.revenue / maxDayRevenue) * 100, 4);
                  const dt = new Date(day.date + "T12:00:00");
                  const label = dt.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center justify-end gap-1 group">
                      <span className="text-[10px] text-stone-500 sm:opacity-0 sm:group-hover:opacity-100 transition">{formatCLP(day.revenue)}</span>
                      <div className="w-full bg-brand rounded-t hover:bg-brand-hover transition cursor-default" style={{ height: `${height}%` }} title={`${label}: ${formatCLP(day.revenue)}`} />
                      <span className="text-[10px] text-stone-400 truncate w-full text-center">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
