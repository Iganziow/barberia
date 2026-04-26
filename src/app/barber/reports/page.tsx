"use client";

import { useCallback, useEffect, useState } from "react";
import BarberShell from "@/features/barber/layout/BarberShell";
import { formatCLP } from "@/lib/format";

type Period = "today" | "week" | "month" | "year";

type ReportData = {
  period: Period;
  dashboard: {
    appointments: {
      total: number;
      completed: number;
      canceled: number;
      noShow: number;
      upcoming: number;
    };
    revenue: number;
    tips: number;
    paidCount: number;
    avgTicket: number;
    commission: number;
    revenueDeltaPct: number | null;
    completedDeltaPct: number | null;
  };
  dailyRevenue: Array<{ date: string; revenue: number }>;
  services: Array<{ id: string; name: string; count: number; revenue: number }>;
};

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "year", label: "Año" },
];

function formatShortDay(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export default function BarberReportsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<ReportData | null>(null);
  const [barberInfo, setBarberInfo] = useState<{ name: string; initials: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cargar identidad del barbero (para shell)
  useEffect(() => {
    fetch("/api/barber/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.barber) {
          const initials = d.barber.name
            .split(" ")
            .map((w: string) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          setBarberInfo({ name: d.barber.name, initials });
        }
      })
      .catch(() => {});
  }, []);

  const fetchReport = useCallback((p: Period) => {
    fetch(`/api/barber/reports?period=${p}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("No se pudieron cargar los reportes");
        return r.json();
      })
      .then((d) => { setData(d); setError(""); })
      .catch((e: Error) => setError(e.message || "Error de conexión"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Disparar el fetch difiriendo el setState con un microtask para
    // satisfacer el lint react-hooks/set-state-in-effect (React 19).
    const t = setTimeout(() => fetchReport(period), 0);
    return () => clearTimeout(t);
  }, [period, fetchReport]);

  const d = data?.dashboard;
  const total = d?.appointments.total ?? 0;
  const cancelRate = total > 0 && d ? (((d.appointments.canceled / total) * 100).toFixed(1)) : "0";
  const noShowRate = total > 0 && d ? (((d.appointments.noShow / total) * 100).toFixed(1)) : "0";

  // Max para el daily bar chart
  const maxDaily = data?.dailyRevenue?.reduce((m, x) => (x.revenue > m ? x.revenue : m), 0) ?? 0;

  return (
    <BarberShell name={barberInfo?.name ?? ""} initials={barberInfo?.initials ?? "?"}>
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900">
            Mis reportes
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Tus estadísticas de citas, ingresos y servicios.
          </p>
        </div>
        {/* Period pills (segmented control) */}
        <div className="inline-flex rounded-lg border border-[#e8e2dc] bg-stone-100/50 p-1 self-start">
          {PERIODS.map((p) => {
            const active = period === p.value;
            return (
              <button
                key={p.value}
                onClick={() => { setLoading(true); setPeriod(p.value); }}
                className={`rounded-md px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
                  active
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Loading / Error ── */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-stone-100 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-stone-100 animate-pulse" />
        </div>
      )}
      {error && !loading && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={() => { setLoading(true); fetchReport(period); }}
            className="text-xs font-semibold underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {!loading && !error && d && (
        <>
          {/* KPI cards — 2 cols mobile, 4 desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
            {/* Comisión (la más importante para el barbero) */}
            <div className="rounded-2xl border border-[#e8e2dc] bg-white p-3 sm:p-4 shadow-sm" style={{ borderLeftWidth: 3, borderLeftColor: "#c87941" }}>
              <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-stone-400">Tu comisión</p>
              <p className="text-lg sm:text-2xl font-extrabold text-brand mt-1 tabular-nums truncate">
                {formatCLP(d.commission)}
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">
                {d.appointments.completed} citas completadas
              </p>
            </div>
            {/* Ingresos */}
            <div className="rounded-2xl border border-[#e8e2dc] bg-white p-3 sm:p-4 shadow-sm" style={{ borderLeftWidth: 3, borderLeftColor: "#10b981" }}>
              <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-stone-400">Ingresos</p>
              <p className="text-lg sm:text-2xl font-extrabold text-stone-900 mt-1 tabular-nums truncate">
                {formatCLP(d.revenue)}
              </p>
              {d.revenueDeltaPct !== null && (
                <p className={`text-[10px] mt-0.5 font-semibold ${d.revenueDeltaPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {d.revenueDeltaPct >= 0 ? "↑" : "↓"} {Math.abs(d.revenueDeltaPct)}% vs período pasado
                </p>
              )}
            </div>
            {/* Ticket prom */}
            <div className="rounded-2xl border border-[#e8e2dc] bg-white p-3 sm:p-4 shadow-sm" style={{ borderLeftWidth: 3, borderLeftColor: "#3b82f6" }}>
              <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-stone-400">Ticket prom.</p>
              <p className="text-lg sm:text-2xl font-extrabold text-stone-900 mt-1 tabular-nums truncate">
                {formatCLP(d.avgTicket)}
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">
                por cita pagada
              </p>
            </div>
            {/* Propinas */}
            <div className="rounded-2xl border border-[#e8e2dc] bg-white p-3 sm:p-4 shadow-sm" style={{ borderLeftWidth: 3, borderLeftColor: "#a855f7" }}>
              <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-stone-400">Propinas</p>
              <p className="text-lg sm:text-2xl font-extrabold text-emerald-600 mt-1 tabular-nums truncate">
                {formatCLP(d.tips)}
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">
                {d.paidCount} pagos
              </p>
            </div>
          </div>

          {/* ── Citas resumen (no-show, canceladas) ── */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
            <div className="rounded-xl border border-[#e8e2dc] bg-white p-3 shadow-sm">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400">Próximas</p>
              <p className="text-base sm:text-lg font-extrabold text-stone-900 mt-1 tabular-nums">
                {d.appointments.upcoming}
              </p>
            </div>
            <div className="rounded-xl border border-[#e8e2dc] bg-white p-3 shadow-sm">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400">Canceladas</p>
              <p className="text-base sm:text-lg font-extrabold text-amber-600 mt-1 tabular-nums">
                {d.appointments.canceled}
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">{cancelRate}%</p>
            </div>
            <div className="rounded-xl border border-[#e8e2dc] bg-white p-3 shadow-sm">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400">No-show</p>
              <p className="text-base sm:text-lg font-extrabold text-red-500 mt-1 tabular-nums">
                {d.appointments.noShow}
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">{noShowRate}%</p>
            </div>
          </div>

          {/* ── Daily revenue chart ── */}
          {data?.dailyRevenue && data.dailyRevenue.length > 0 && (
            <section className="rounded-2xl border border-[#e8e2dc] bg-white p-4 sm:p-5 shadow-sm mb-4 sm:mb-5">
              <h2 className="text-sm sm:text-base font-bold text-stone-900 mb-3">Ingresos diarios</h2>
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className={`flex items-end gap-1 h-32 sm:h-40 ${data.dailyRevenue.length > 14 ? "min-w-[640px]" : "min-w-full"}`}>
                  {data.dailyRevenue.map((day) => {
                    const heightPct = maxDaily > 0 ? Math.max((day.revenue / maxDaily) * 100, day.revenue > 0 ? 4 : 2) : 2;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center justify-end gap-1 group relative min-w-[20px]">
                        {day.revenue > 0 && (
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-stone-800 text-white text-[10px] font-semibold px-2 py-0.5 rounded tabular-nums pointer-events-none whitespace-nowrap z-10">
                            {formatCLP(day.revenue)}
                          </span>
                        )}
                        <div
                          className={`w-full rounded-md transition-colors ${day.revenue > 0 ? "bg-brand/75 group-hover:bg-brand" : "bg-stone-200"}`}
                          style={{ height: `${heightPct}%` }}
                          title={`${formatShortDay(day.date)}: ${formatCLP(day.revenue)}`}
                        />
                        <span className="text-[8px] sm:text-[9px] text-stone-400 truncate w-full text-center">
                          {formatShortDay(day.date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ── Top servicios ── */}
          {data?.services && data.services.length > 0 && (
            <section className="rounded-2xl border border-[#e8e2dc] bg-white p-4 sm:p-5 shadow-sm mb-4">
              <h2 className="text-sm sm:text-base font-bold text-stone-900 mb-3">Tus servicios más vendidos</h2>
              <div className="divide-y divide-[#f0ece8]">
                {data.services.map((s, idx) => (
                  <div key={s.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-brand/10 text-brand text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-900 truncate">{s.name}</p>
                      <p className="text-[11px] text-stone-500">
                        {s.count} {s.count === 1 ? "venta" : "ventas"}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-stone-900 tabular-nums shrink-0">
                      {formatCLP(s.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </BarberShell>
  );
}
