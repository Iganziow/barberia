"use client";

import { useCallback, useEffect, useState } from "react";
import InfoTip from "@/components/ui/InfoTip";
import UserAvatarBadge from "@/components/ui/UserAvatarBadge";
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

// ─── Helpers ──────────────────────────────────────────────────────────
function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function firstName(name: string) {
  return name.split(" ")[0] || name;
}

// Subtítulo del header según period: "Hoy, 23 de abril" / "Semana del 21 al 27" / etc.
function periodSubtitle(period: string, from: string, to: string): string {
  const fromD = new Date(from);
  const toD = new Date(to);

  if (period.startsWith("custom:")) {
    const fmt: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
    return `Del ${fromD.toLocaleDateString("es-CL", fmt)} al ${toD.toLocaleDateString("es-CL", fmt)}`;
  }

  switch (period) {
    case "today": {
      return `Hoy, ${new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}`;
    }
    case "week": {
      // Número ISO de semana aproximado (del lunes)
      const target = new Date(fromD);
      const dayNum = (target.getDay() + 6) % 7;
      target.setDate(target.getDate() - dayNum + 3);
      const firstThursday = target.valueOf();
      target.setMonth(0, 1);
      if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
      }
      const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
      return `${new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })} · Semana ${weekNum}`;
    }
    case "month":
      return fromD.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
    case "year":
      return `Año ${fromD.getFullYear()}`;
    default:
      return "";
  }
}

// ─── StatCard — card con borde izquierdo de color semántico ──────────
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
      className="relative rounded-2xl border border-[#e8e2dc] bg-white p-5 shadow-sm overflow-hidden group hover:shadow-md transition-all"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
    >
      {/* Subtle gradient wash on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top right, ${borderColor}12, transparent 70%)`,
        }}
      />
      <div className="relative">
        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">{label}</p>
        <p className="text-[26px] sm:text-[28px] leading-none font-extrabold text-stone-900 mt-2 tracking-tight tabular-nums">
          {value}
        </p>
        {sub && <p className="text-xs text-stone-500 mt-2">{sub}</p>}
      </div>
    </div>
  );
}

// ─── DailyBars — chart simple de barras para ingresos diarios ─────────
function DailyBars({ data }: { data: Array<{ date: string; revenue: number }> }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-stone-400 text-center py-8">Sin datos para este periodo</p>
    );
  }
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Si son muchos días (mes, año), muestro scroll horizontal. Si son pocos
  // (semana), los acomodo en el ancho disponible sin scroll.
  const needsScroll = data.length > 10;

  return (
    <div className={needsScroll ? "overflow-x-auto -mx-5 px-5 pb-1" : ""}>
      <div
        className={`flex items-end gap-2 h-40 ${needsScroll ? "min-w-[640px]" : ""}`}
      >
        {data.map((d) => {
          const day = new Date(d.date + "T12:00:00");
          const isPast = day <= now;
          const isToday = day.toDateString() === now.toDateString();
          const heightPct = Math.max((d.revenue / max) * 100, d.revenue > 0 ? 4 : 2);

          const dayLabel = day
            .toLocaleDateString("es-CL", { weekday: "short" })
            .replace(".", "")
            .slice(0, 3)
            .toUpperCase();

          return (
            <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-2 group relative">
              {/* Tooltip on hover */}
              {d.revenue > 0 && (
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-stone-800 text-white text-[10px] font-semibold px-2 py-0.5 rounded tabular-nums pointer-events-none whitespace-nowrap z-10">
                  {formatCLP(d.revenue)}
                </span>
              )}
              <div
                className={`w-full rounded-md transition-colors ${
                  isToday
                    ? "bg-brand"
                    : isPast && d.revenue > 0
                      ? "bg-brand/75 group-hover:bg-brand"
                      : "bg-stone-200"
                }`}
                style={{ height: `${heightPct}%` }}
                title={`${dayLabel}: ${formatCLP(d.revenue)}`}
              />
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  isToday ? "text-brand" : "text-stone-400"
                }`}
              >
                {dayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportsDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState<DashboardData | null>(null);
  const [commissions, setCommissions] = useState<CommissionRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Custom date range
  const todayStr = new Date().toISOString().slice(0, 10);
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(todayStr);
  const [customTo, setCustomTo] = useState(todayStr);
  const isCustom = period.startsWith("custom:");

  function applyCustomRange() {
    if (!customFrom || !customTo) return;
    if (customFrom > customTo) return;
    setLoading(true);
    setPeriod(`custom:${customFrom}:${customTo}`);
    setCustomOpen(false);
  }

  const fetchData = useCallback(() => {
    if (activeTab === "commissions") {
      fetch(`/api/admin/reports?period=${period}&type=commissions`)
        .then(async (r) => {
          if (!r.ok) throw new Error("No se pudieron cargar las liquidaciones");
          return r.json();
        })
        .then((d) => { setCommissions(d.commissions || []); setFetchError(""); })
        .catch((e: Error) => setFetchError(e.message || "Error de conexión"))
        .finally(() => setLoading(false));
    } else {
      fetch(`/api/admin/reports?period=${period}`)
        .then(async (r) => {
          if (!r.ok) throw new Error("No se pudieron cargar los reportes");
          return r.json();
        })
        .then((d) => { setData(d); setFetchError(""); })
        .catch((e: Error) => setFetchError(e.message || "Error de conexión"))
        .finally(() => setLoading(false));
    }
  }, [period, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const d = data?.dashboard;
  const headerSubtitle = d ? periodSubtitle(period, d.from, d.to) : "";

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

  // Tasas derivadas (para subs de stat cards)
  const totalAppts = d?.appointments.total ?? 0;
  const cancelRate = totalAppts > 0 ? (((d?.appointments.canceled ?? 0) / totalAppts) * 100).toFixed(1) : "0";
  const noShowRate = totalAppts > 0 ? (((d?.appointments.noShow ?? 0) / totalAppts) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-[#e8e2dc] print:border-0 print:pb-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Reportes</h1>
          <p className="text-sm text-stone-500 mt-0.5 capitalize">
            {headerSubtitle || "Ingresos, citas y liquidaciones de tu barbería"}
          </p>
        </div>
        <div className="flex items-start gap-4 sm:gap-8 flex-wrap print:hidden">
          {d && activeTab === "dashboard" && (
            <div className="flex items-start gap-6 sm:gap-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                  Ingresos{" "}
                  {period === "today" ? "hoy" : period === "week" ? "semana" : period === "month" ? "mes" : period === "year" ? "año" : "periodo"}
                </p>
                <p className="text-2xl font-extrabold text-brand mt-0.5 tabular-nums">
                  {formatCLP(d.revenue.total)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                  Citas completadas
                </p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-0.5 tabular-nums">
                  {d.appointments.completed}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <a
              href={`/api/admin/reports/export?period=${period}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e2dc] bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:border-brand/40 hover:text-brand transition"
              title="Descargar reporte CSV"
            >
              Exportar CSV
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e2dc] bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:border-brand/40 hover:text-brand transition"
              title="Imprimir o guardar como PDF"
            >
              PDF
            </button>
            <UserAvatarBadge />
          </div>
        </div>
      </div>

      {/* ── Top-level tabs (Resumen / Liquidaciones) ─────────────── */}
      <div className="flex items-center gap-1 border-b border-[#e8e2dc] -mt-2 print:hidden">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setLoading(true); setActiveTab(t.value); }}
            className={`relative px-4 py-2 text-sm font-medium transition ${
              activeTab === t.value ? "text-brand" : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {t.label}
            {activeTab === t.value && (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-brand rounded-t" />
            )}
          </button>
        ))}
        <InfoTip text="Liquidaciones muestra cuánto debes pagarle a cada barbero según las citas completadas en el período." />
      </div>

      {/* ── Period pills (solo en Resumen) ────────────────────────── */}
      {activeTab === "dashboard" && (
        <div className="flex items-center gap-2 flex-wrap print:hidden">
          <div className="relative flex gap-1 rounded-lg border border-[#e8e2dc] bg-stone-100/50 p-1">
            {PERIODS.map((p) => {
              const active = period === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => { setLoading(true); setPeriod(p.value); }}
                  className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
                    active
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              onClick={() => setCustomOpen((v) => !v)}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
                isCustom
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
              title="Rango personalizado"
            >
              {isCustom ? (
                <span className="tabular-nums">
                  {period.split(":")[1]} → {period.split(":")[2]}
                </span>
              ) : (
                "Rango…"
              )}
            </button>
            {customOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 w-[280px] rounded-xl border border-[#e8e2dc] bg-white shadow-xl p-4 space-y-3">
                <div>
                  <label className="field-label">Desde</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    max={customTo || undefined}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="field-label">Hasta</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    min={customFrom || undefined}
                    className="input-field"
                  />
                </div>
                {customFrom > customTo && (
                  <p className="text-xs text-red-600">La fecha &quot;desde&quot; debe ser anterior a &quot;hasta&quot;.</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={applyCustomRange}
                    disabled={!customFrom || !customTo || customFrom > customTo}
                    className="btn-primary text-xs flex-1 disabled:opacity-50"
                  >
                    Aplicar rango
                  </button>
                  <button
                    onClick={() => setCustomOpen(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Loading / error ───────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-stone-100 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="h-64 rounded-2xl bg-stone-100 animate-pulse" />
            <div className="h-64 rounded-2xl bg-stone-100 animate-pulse" />
          </div>
        </div>
      ) : fetchError ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{fetchError}</span>
          <button onClick={fetchData} className="text-xs font-semibold underline hover:no-underline">Reintentar</button>
        </div>
      ) : activeTab === "commissions" ? (
        /* ── Liquidaciones ─────────────────────────────────────── */
        <div className="rounded-2xl border border-[#e8e2dc] bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
            <h2 className="font-bold text-stone-900">Liquidaciones de barberos</h2>
            {commissions && commissions.length > 0 && (
              <button
                onClick={exportCommissionsCSV}
                className="self-start sm:self-auto rounded-lg border border-[#e8e2dc] px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition"
              >
                Exportar CSV
              </button>
            )}
          </div>
          {!commissions || commissions.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">No hay datos para este período</p>
          ) : (
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
                      <td className="py-3 pr-4 text-right text-stone-600 tabular-nums">{c.completed}</td>
                      <td className="py-3 pr-4 text-right text-stone-600 tabular-nums">{formatCLP(c.revenue)}</td>
                      <td className="py-3 pr-4 text-right text-stone-400 text-xs tabular-nums">
                        {c.commissionType === "PERCENTAGE"
                          ? `${c.commissionValue}% × ${formatCLP(c.revenue)}`
                          : `${formatCLP(c.commissionValue)} × ${c.completed} citas`}
                      </td>
                      <td className="py-3 text-right font-bold text-stone-900 tabular-nums">{formatCLP(c.commission)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#e8e2dc]">
                    <td className="pt-3 font-semibold text-stone-700">Total</td>
                    <td className="pt-3 text-right font-semibold text-stone-700 tabular-nums">
                      {commissions.reduce((s, c) => s + c.completed, 0)}
                    </td>
                    <td className="pt-3 text-right font-semibold text-stone-700 tabular-nums">
                      {formatCLP(commissions.reduce((s, c) => s + c.revenue, 0))}
                    </td>
                    <td />
                    <td className="pt-3 text-right font-bold text-brand text-base tabular-nums">
                      {formatCLP(commissions.reduce((s, c) => s + c.commission, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      ) : !d ? (
        <div className="text-center text-stone-400 py-12">Error al cargar datos</div>
      ) : (
        /* ── Dashboard ──────────────────────────────────────────── */
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Ingresos"
              value={formatCLP(d.revenue.total)}
              sub={`${formatCLP(d.revenue.paid)} cobrado · ${formatCLP(d.revenue.pending)} pendiente`}
              borderColor="#c87941"
            />
            <StatCard
              label="Completadas"
              value={String(d.appointments.completed)}
              sub={`de ${totalAppts} agendadas`}
              borderColor="#10b981"
            />
            <StatCard
              label="Canceladas"
              value={String(d.appointments.canceled)}
              sub={`${cancelRate}% tasa cancelación`}
              borderColor="#f59e0b"
            />
            <StatCard
              label="No-show"
              value={String(d.appointments.noShow)}
              sub={`${noShowRate}% no se presentó`}
              borderColor="#ef4444"
            />
          </div>

          {/* Charts row: Daily revenue + Barber breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Daily revenue */}
            <div className="rounded-2xl border border-[#e8e2dc] bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-stone-900">Ingresos diarios</h2>
                {(data?.dailyRevenue || []).length > 0 && (
                  <span className="text-xs text-stone-400 tabular-nums">
                    Total: <span className="font-semibold text-stone-700">{formatCLP(d.revenue.total)}</span>
                  </span>
                )}
              </div>
              <DailyBars data={data?.dailyRevenue || []} />
            </div>

            {/* Barber breakdown */}
            <div className="rounded-2xl border border-[#e8e2dc] bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-stone-900">Por barbero</h2>
                <button
                  type="button"
                  onClick={() => { setLoading(true); setActiveTab("commissions"); }}
                  className="text-xs font-semibold text-brand hover:text-brand-hover transition"
                >
                  Liquidaciones →
                </button>
              </div>
              {(data?.barbers || []).length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-8">
                  Sin datos de barberos en este periodo
                </p>
              ) : (
                <div className="divide-y divide-[#f0ece8]">
                  {(data?.barbers || []).map((b) => (
                    <div key={b.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ backgroundColor: b.color || "#c87941" }}
                      >
                        {initials(b.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900 truncate">{firstName(b.name)}</p>
                        <p className="text-xs text-stone-500">
                          {b.completed} cita{b.completed !== 1 ? "s" : ""} completada{b.completed !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-stone-900 tabular-nums shrink-0">
                        {formatCLP(b.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Services breakdown (menor prioridad, debajo) */}
          {(data?.services || []).length > 0 && (
            <div className="rounded-2xl border border-[#e8e2dc] bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-stone-900">Servicios más solicitados</h2>
              </div>
              <div className="divide-y divide-[#f0ece8]">
                {(data?.services || []).slice(0, 8).map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-800 truncate">{s.name}</p>
                      <p className="text-xs text-stone-500">
                        {s.count} {s.count === 1 ? "venta" : "ventas"}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-stone-900 tabular-nums shrink-0">
                      {formatCLP(s.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
