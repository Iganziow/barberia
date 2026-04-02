"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import BarberShell from "@/features/barber/layout/BarberShell";
import BlockTimeModal from "@/features/barber/BlockTimeModal";
import type { CalendarEvent } from "@/features/barber/BarberCalendar";

const BarberCalendar = dynamic(() => import("@/features/barber/BarberCalendar"), { ssr: false });

/* ── Types ── */
type Stats = {
  totalToday: number;
  doneToday: number;
  pendingToday: number;
  revenueToday: number;
};

type BarberInfo = { id: string; name: string; color: string | null };

/* ── Helpers ── */
function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; text: string }> = {
  RESERVED: { label: "Pendiente", color: "#3B82F6", bg: "bg-blue-50", text: "text-blue-700" },
  DONE:     { label: "Completado", color: "#10B981", bg: "bg-emerald-50", text: "text-emerald-700" },
  NO_SHOW:  { label: "No asistió", color: "#EF4444", bg: "bg-red-50", text: "text-red-600" },
  CANCELED: { label: "Cancelado", color: "#9CA3AF", bg: "bg-stone-100", text: "text-stone-500" },
};

export default function BarberPage() {
  const [barber, setBarber] = useState<BarberInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Block time modal
  const [blockModal, setBlockModal] = useState<{ open: boolean; start?: string; end?: string }>({ open: false });

  // Appointment detail panel
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const initials = barber
    ? barber.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  /* ── Fetch barber info + stats ── */
  useEffect(() => {
    fetch("/api/barber/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) { setBarber(d.barber); setStats(d.stats); } })
      .catch(() => {});
  }, []);

  const refreshStats = useCallback(() => {
    fetch("/api/barber/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setStats(d.stats); })
      .catch(() => {});
  }, []);

  /* ── Calendar: load range ── */
  const loadCalendarEvents = useCallback(async (from: string, to: string) => {
    try {
      const [aptsRes, blocksRes] = await Promise.all([
        fetch(`/api/barber/appointments?from=${from}&to=${to}`)
          .then((r) => r.ok ? r.json() : { appointments: [] })
          .catch(() => ({ appointments: [] })),
        fetch(`/api/barber/block-times?from=${from}&to=${to}`)
          .then((r) => r.ok ? r.json() : { blockTimes: [] })
          .catch(() => ({ blockTimes: [] })),
      ]);

      type AptRaw = { id: string; clientName: string; clientPhone: string | null; serviceName: string; serviceDuration: number; start: string; end: string; status: string; price: number; notePublic: string | null };

      const aptEvents: CalendarEvent[] = (aptsRes.appointments || []).map(
        (a: AptRaw) => ({
          id: a.id,
          title: `${a.clientName}\n${a.serviceName}`,
          start: a.start,
          end: a.end,
          kind: "APPOINTMENT" as const,
          status: a.status,
          // Extra data for detail panel
          clientName: a.clientName,
          clientPhone: a.clientPhone,
          serviceName: a.serviceName,
          serviceDuration: a.serviceDuration,
          price: a.price,
          notePublic: a.notePublic,
        })
      );

      const blockEvents: CalendarEvent[] = (blocksRes.blockTimes || []).map(
        (b: { id: string; reason: string; start: string; end: string }) => ({
          id: b.id,
          title: b.reason,
          start: b.start,
          end: b.end,
          kind: "BLOCK" as const,
        })
      );

      setCalEvents([...aptEvents, ...blockEvents]);
    } catch {
      // Silently ignore
    }
  }, []);

  /* ── Update appointment status ── */
  async function updateStatus(id: string, status: "DONE" | "NO_SHOW" | "RESERVED") {
    if (status === "NO_SHOW" && !window.confirm("¿Marcar como no asistió? Esta acción afecta el historial del cliente.")) {
      return;
    }
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/barber/appointments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setCalEvents((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status } : e))
        );
        if (selectedEvent?.id === id) {
          setSelectedEvent((prev) => prev ? { ...prev, status } : null);
        }
        refreshStats();
      }
    } finally {
      setUpdatingId(null);
    }
  }

  /* ── Delete block time ── */
  async function deleteBlock(id: string) {
    const res = await fetch(`/api/barber/block-times/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCalEvents((prev) => prev.filter((e) => e.id !== id));
      setSelectedEvent(null);
    }
  }

  const isUpdating = updatingId !== null;
  const ev = selectedEvent;
  const evCfg = ev?.status ? STATUS_CONFIG[ev.status] : null;

  return (
    <BarberShell name={barber?.name ?? ""} initials={initials}>
      {/* ── Stats row ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="rounded-xl bg-white border border-[#e8e2dc] px-3 py-2.5 shadow-sm flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <svg width="14" height="14" fill="none" stroke="#3B82F6" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            </div>
            <div>
              <div className="text-lg font-black text-stone-800 leading-none">{stats.totalToday}</div>
              <div className="text-[10px] text-stone-400 font-medium">Citas hoy</div>
            </div>
          </div>
          <div className="rounded-xl bg-white border border-[#e8e2dc] px-3 py-2.5 shadow-sm flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <svg width="14" height="14" fill="none" stroke="#F59E0B" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            </div>
            <div>
              <div className="text-lg font-black text-stone-800 leading-none">{stats.pendingToday}</div>
              <div className="text-[10px] text-stone-400 font-medium">Pendientes</div>
            </div>
          </div>
          <div className="rounded-xl bg-white border border-[#e8e2dc] px-3 py-2.5 shadow-sm flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <svg width="14" height="14" fill="none" stroke="#10B981" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <div>
              <div className="text-lg font-black text-emerald-600 leading-none">{stats.doneToday}</div>
              <div className="text-[10px] text-stone-400 font-medium">Completadas</div>
            </div>
          </div>
          <div className="rounded-xl bg-white border border-[#e8e2dc] px-3 py-2.5 shadow-sm flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#c87941]/10 flex items-center justify-center shrink-0">
              <svg width="14" height="14" fill="none" stroke="#c87941" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
            </div>
            <div>
              <div className="text-lg font-black text-[#c87941] leading-none truncate">{formatCLP(stats.revenueToday)}</div>
              <div className="text-[10px] text-stone-400 font-medium">Cobrado</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main layout: calendar + detail panel ── */}
      <div className="flex gap-4 items-start">
        {/* Calendar */}
        <section className="flex-1 min-w-0 rounded-xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
          <div className="p-2 sm:p-3">
            <BarberCalendar
              events={calEvents}
              onSelectSlot={({ isoStart, isoEnd }) => {
                setSelectedEvent(null);
                setBlockModal({ open: true, start: isoStart, end: isoEnd });
              }}
              onClickEvent={(event) => setSelectedEvent(event)}
              onRangeChange={loadCalendarEvents}
            />
          </div>
        </section>

        {/* Detail side panel (desktop only — on mobile we use a bottom sheet) */}
        <aside className="hidden lg:block w-[320px] shrink-0 sticky top-20">
          {ev ? (
            <div className="rounded-xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
              {/* Color header */}
              <div className="h-1.5" style={{ backgroundColor: ev.kind === "BLOCK" ? "#a8a29e" : (evCfg?.color ?? "#c87941") }} />

              {ev.kind === "BLOCK" ? (
                /* ── Block detail ── */
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-stone-100 flex items-center justify-center">
                      <svg width="14" height="14" fill="none" stroke="#78716c" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Bloqueo</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-stone-900">{ev.title}</p>
                  <p className="text-xs text-stone-400 mt-1">
                    {formatDate(ev.start)} &middot; {formatTime(ev.start)} – {formatTime(ev.end)}
                  </p>
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => deleteBlock(ev.id)}
                      className="w-full rounded-lg bg-red-50 py-2 text-sm font-bold text-red-600 hover:bg-red-100 transition"
                    >
                      Eliminar bloqueo
                    </button>
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="w-full rounded-lg border border-[#e8e2dc] py-2 text-sm font-medium text-stone-500 hover:bg-stone-50 transition"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Appointment detail ── */
                <div className="p-4">
                  {/* Status badge */}
                  {evCfg && (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${evCfg.bg} ${evCfg.text} mb-3`}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: evCfg.color }} />
                      {evCfg.label}
                    </span>
                  )}

                  {/* Client */}
                  <p className="text-base font-bold text-stone-900">
                    {(ev as CalendarEvent & { clientName?: string }).clientName ?? ev.title.split("\n")[0]}
                  </p>
                  {(ev as CalendarEvent & { clientPhone?: string | null }).clientPhone && (
                    <a
                      href={`https://wa.me/${((ev as CalendarEvent & { clientPhone?: string | null }).clientPhone ?? "").replace(/\D/g, "")}`}
                      className="inline-flex items-center gap-1 mt-1 text-xs text-emerald-600 hover:text-emerald-700"
                      target="_blank" rel="noopener noreferrer"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.31-.726-5.99-1.955l-.42-.312-3.072 1.03 1.03-3.072-.312-.42A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                      WhatsApp
                    </a>
                  )}

                  {/* Service + time */}
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-stone-600">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" /></svg>
                      {(ev as CalendarEvent & { serviceName?: string }).serviceName ?? ev.title.split("\n")[1]}
                      {(ev as CalendarEvent & { serviceDuration?: number }).serviceDuration && (
                        <span className="text-stone-400"> &middot; {(ev as CalendarEvent & { serviceDuration?: number }).serviceDuration} min</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-stone-600">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                      {formatDate(ev.start)} &middot; {formatTime(ev.start)} – {formatTime(ev.end)}
                    </div>
                    {(ev as CalendarEvent & { price?: number }).price !== undefined && (
                      <div className="flex items-center gap-2 text-stone-800 font-bold">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
                        {formatCLP((ev as CalendarEvent & { price?: number }).price!)}
                      </div>
                    )}
                  </div>

                  {/* Note */}
                  {(ev as CalendarEvent & { notePublic?: string | null }).notePublic && (
                    <div className="mt-3 rounded-lg bg-stone-50 px-3 py-2">
                      <p className="text-[11px] text-stone-500 italic">&ldquo;{(ev as CalendarEvent & { notePublic?: string | null }).notePublic}&rdquo;</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 space-y-2">
                    {ev.status === "RESERVED" && (
                      <>
                        <button
                          onClick={() => updateStatus(ev.id, "DONE")}
                          disabled={isUpdating}
                          className="w-full rounded-lg bg-emerald-50 py-2 text-sm font-bold text-emerald-600 hover:bg-emerald-100 transition disabled:opacity-50"
                        >
                          Marcar completado
                        </button>
                        <button
                          onClick={() => updateStatus(ev.id, "NO_SHOW")}
                          disabled={isUpdating}
                          className="w-full rounded-lg bg-red-50 py-2 text-sm font-bold text-red-500 hover:bg-red-100 transition disabled:opacity-50"
                        >
                          No asistió
                        </button>
                      </>
                    )}
                    {(ev.status === "DONE" || ev.status === "NO_SHOW") && (
                      <button
                        onClick={() => updateStatus(ev.id, "RESERVED")}
                        disabled={isUpdating}
                        className="w-full rounded-lg bg-stone-50 py-2 text-sm font-bold text-stone-600 hover:bg-stone-100 transition disabled:opacity-50"
                      >
                        Deshacer
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="w-full rounded-lg border border-[#e8e2dc] py-2 text-sm font-medium text-stone-500 hover:bg-stone-50 transition"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Empty panel: block time CTA ── */
            <div className="rounded-xl border border-dashed border-stone-300 bg-white/50 p-5 text-center">
              <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-stone-100">
                <svg width="20" height="20" fill="none" stroke="#78716c" strokeWidth="1.8" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <p className="text-sm font-medium text-stone-500 mb-1">Haz clic en una cita</p>
              <p className="text-xs text-stone-400 mb-4">para ver el detalle y gestionar su estado</p>
              <button
                onClick={() => setBlockModal({ open: true })}
                className="w-full rounded-lg bg-[#c87941] py-2 text-sm font-semibold text-white hover:bg-[#b56a35] transition shadow-sm"
              >
                Bloquear horario
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* ── Mobile: bottom sheet for event detail ── */}
      {ev && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="h-1 w-8 rounded-full bg-stone-300" />
            </div>

            <div className="h-1" style={{ backgroundColor: ev.kind === "BLOCK" ? "#a8a29e" : (evCfg?.color ?? "#c87941") }} />

            {ev.kind === "BLOCK" ? (
              <div className="p-4">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Bloqueo</p>
                <p className="text-base font-bold text-stone-900">{ev.title}</p>
                <p className="text-xs text-stone-400 mt-1">{formatDate(ev.start)} &middot; {formatTime(ev.start)} – {formatTime(ev.end)}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={() => deleteBlock(ev.id)} className="rounded-lg bg-red-50 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition">Eliminar</button>
                  <button onClick={() => setSelectedEvent(null)} className="rounded-lg border border-[#e8e2dc] py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition">Cerrar</button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-base font-bold text-stone-900">
                      {(ev as CalendarEvent & { clientName?: string }).clientName ?? ev.title.split("\n")[0]}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {(ev as CalendarEvent & { serviceName?: string }).serviceName ?? ev.title.split("\n")[1]}
                      {(ev as CalendarEvent & { serviceDuration?: number }).serviceDuration && ` · ${(ev as CalendarEvent & { serviceDuration?: number }).serviceDuration} min`}
                    </p>
                  </div>
                  {evCfg && (
                    <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${evCfg.bg} ${evCfg.text}`}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: evCfg.color }} />
                      {evCfg.label}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-stone-500">{formatDate(ev.start)} &middot; {formatTime(ev.start)} – {formatTime(ev.end)}</span>
                  {(ev as CalendarEvent & { price?: number }).price !== undefined && (
                    <span className="font-bold text-stone-800">{formatCLP((ev as CalendarEvent & { price?: number }).price!)}</span>
                  )}
                </div>

                {(ev as CalendarEvent & { clientPhone?: string | null }).clientPhone && (
                  <a
                    href={`https://wa.me/${((ev as CalendarEvent & { clientPhone?: string | null }).clientPhone ?? "").replace(/\D/g, "")}`}
                    className="inline-flex items-center gap-1.5 mb-3 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600"
                    target="_blank" rel="noopener noreferrer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.31-.726-5.99-1.955l-.42-.312-3.072 1.03 1.03-3.072-.312-.42A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                    Contactar por WhatsApp
                  </a>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {ev.status === "RESERVED" && (
                    <>
                      <button onClick={() => updateStatus(ev.id, "DONE")} disabled={isUpdating} className="rounded-lg bg-emerald-50 py-2.5 text-sm font-bold text-emerald-600 hover:bg-emerald-100 transition disabled:opacity-50">Completar</button>
                      <button onClick={() => updateStatus(ev.id, "NO_SHOW")} disabled={isUpdating} className="rounded-lg bg-red-50 py-2.5 text-sm font-bold text-red-500 hover:bg-red-100 transition disabled:opacity-50">No asistió</button>
                    </>
                  )}
                  {(ev.status === "DONE" || ev.status === "NO_SHOW") && (
                    <button onClick={() => updateStatus(ev.id, "RESERVED")} disabled={isUpdating} className="rounded-lg bg-stone-50 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-100 transition disabled:opacity-50">Deshacer</button>
                  )}
                  <button onClick={() => setSelectedEvent(null)} className="rounded-lg border border-[#e8e2dc] py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition">Cerrar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile FAB: block time ── */}
      <button
        onClick={() => setBlockModal({ open: true })}
        className="lg:hidden fixed bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-[#c87941] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#c87941]/25 hover:bg-[#b56a35] transition"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        Bloquear
      </button>

      {/* ── Block time modal ── */}
      {blockModal.open && (
        <BlockTimeModal
          defaultStart={blockModal.start}
          defaultEnd={blockModal.end}
          onClose={() => setBlockModal({ open: false })}
          onCreated={() => {
            setBlockModal({ open: false });
            setCalEvents([]);
          }}
        />
      )}
    </BarberShell>
  );
}
