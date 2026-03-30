"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import BarberShell from "@/features/barber/layout/BarberShell";
import BlockTimeModal from "@/features/barber/BlockTimeModal";
import type { CalendarEvent } from "@/features/barber/BarberCalendar";

const BarberCalendar = dynamic(() => import("@/features/barber/BarberCalendar"), { ssr: false });

/* ── Types ── */
type Appointment = {
  id: string;
  start: string;
  end: string;
  status: "RESERVED" | "DONE" | "NO_SHOW" | "CANCELED";
  price: number;
  serviceName: string;
  serviceDuration: number;
  clientName: string;
  clientPhone: string | null;
  notePublic: string | null;
};

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
function formatDateLabel(d: Date) {
  return d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}
function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }
function isToday(d: Date) { return toDateStr(d) === toDateStr(new Date()); }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; text: string; dot: string }> = {
  RESERVED: { label: "Pendiente", color: "#3B82F6", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  DONE:     { label: "Completado", color: "#10B981", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  NO_SHOW:  { label: "No asistió", color: "#EF4444", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" },
  CANCELED: { label: "Cancelado", color: "#9CA3AF", bg: "bg-stone-100", text: "text-stone-500", dot: "bg-stone-400" },
};

/* ── Event action popover ── */
type EventAction = {
  event: CalendarEvent;
  x: number;
  y: number;
};

export default function BarberPage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [barber, setBarber] = useState<BarberInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [blockModal, setBlockModal] = useState<{ open: boolean; start?: string; end?: string }>({ open: false });
  const [eventAction, setEventAction] = useState<EventAction | null>(null);

  const initials = barber
    ? barber.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

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

  const loadListAppointments = useCallback(() => {
    setLoading(true);
    fetch(`/api/barber/appointments?date=${toDateStr(currentDate)}`)
      .then((r) => r.ok ? r.json() : { appointments: [] })
      .then((d) => setAppointments(d.appointments || []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [currentDate]);

  useEffect(() => {
    if (view === "list") loadListAppointments();
  }, [view, loadListAppointments]);

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

      const aptEvents: CalendarEvent[] = (aptsRes.appointments || []).map(
        (a: Appointment) => ({
          id: a.id,
          title: `${a.clientName}\n${a.serviceName}`,
          start: a.start,
          end: a.end,
          kind: "APPOINTMENT" as const,
          status: a.status,
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
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
        setCalEvents((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status } : e))
        );
        if (isToday(currentDate)) refreshStats();
      }
    } finally {
      setUpdatingId(null);
      setEventAction(null);
    }
  }

  async function deleteBlock(id: string) {
    const res = await fetch(`/api/barber/block-times/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCalEvents((prev) => prev.filter((e) => e.id !== id));
      setEventAction(null);
    }
  }

  function prevDay() { setCurrentDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; }); }
  function nextDay() { setCurrentDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; }); }

  const isPast = (start: string) => new Date(start) < new Date();

  // Progress for today
  const completedCount = appointments.filter((a) => a.status === "DONE").length;
  const activeCount = appointments.filter((a) => a.status !== "CANCELED").length;
  const progressPct = activeCount > 0 ? Math.round((completedCount / activeCount) * 100) : 0;

  return (
    <BarberShell
      name={barber?.name ?? ""}
      initials={initials}
      view={view}
      onViewChange={setView}
    >
      {/* ═══════════════ LIST VIEW ═══════════════ */}
      {view === "list" && (
        <>
          {/* Date navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevDay} className="rounded-lg p-2.5 text-stone-400 hover:bg-stone-100 active:bg-stone-200 transition">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="text-center">
              <p className="text-sm font-bold text-stone-800 capitalize">{formatDateLabel(currentDate)}</p>
              {isToday(currentDate) && (
                <span className="inline-block mt-0.5 rounded-full bg-[#c87941] px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">Hoy</span>
              )}
            </div>
            <button onClick={nextDay} className="rounded-lg p-2.5 text-stone-400 hover:bg-stone-100 active:bg-stone-200 transition">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>

          {/* Stats cards (today only) */}
          {isToday(currentDate) && stats && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-xl bg-white border border-[#e8e2dc] p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg width="12" height="12" fill="none" stroke="#3B82F6" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                  </div>
                  <span className="text-[10px] font-semibold text-stone-400 uppercase">Citas</span>
                </div>
                <div className="text-2xl font-black text-stone-800">{stats.totalToday}</div>
              </div>
              <div className="rounded-xl bg-white border border-[#e8e2dc] p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <svg width="12" height="12" fill="none" stroke="#10B981" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                  </div>
                  <span className="text-[10px] font-semibold text-stone-400 uppercase">Listas</span>
                </div>
                <div className="text-2xl font-black text-emerald-600">{stats.doneToday}</div>
              </div>
              <div className="rounded-xl bg-white border border-[#e8e2dc] p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded-lg bg-[#c87941]/10 flex items-center justify-center">
                    <svg width="12" height="12" fill="none" stroke="#c87941" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
                  </div>
                  <span className="text-[10px] font-semibold text-stone-400 uppercase">Cobrado</span>
                </div>
                <div className="text-lg font-black text-[#c87941] truncate">{formatCLP(stats.revenueToday)}</div>
              </div>
            </div>
          )}

          {/* Day progress bar (only if there are appointments) */}
          {isToday(currentDate) && activeCount > 0 && (
            <div className="mb-4 rounded-lg bg-white border border-[#e8e2dc] px-4 py-2.5 shadow-sm flex items-center gap-3">
              <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs font-bold text-stone-500 whitespace-nowrap">
                {completedCount}/{activeCount}
              </span>
            </div>
          )}

          {/* Appointment list */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl bg-white border border-[#e8e2dc] p-4 animate-pulse">
                  <div className="flex gap-3 items-center">
                    <div className="h-12 w-1 rounded-full bg-stone-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-stone-100 rounded w-32" />
                      <div className="h-3 bg-stone-100 rounded w-20" />
                    </div>
                    <div className="h-6 w-16 bg-stone-100 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="rounded-2xl border border-[#e8e2dc] bg-white overflow-hidden shadow-sm">
              <div className="h-1 bg-gradient-to-r from-[#c87941] via-[#d4a34a] to-[#c87941]/30" />
              <div className="p-8 text-center">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-stone-50">
                  <svg width="32" height="32" fill="none" stroke="#c87941" strokeWidth="1.5" viewBox="0 0 24 24">
                    <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
                    <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-stone-800">
                  {isToday(currentDate) ? "Sin citas por hoy" : "Sin citas este día"}
                </p>
                <p className="text-sm text-stone-400 mt-1 mb-6 max-w-xs mx-auto">
                  {isToday(currentDate)
                    ? "Aprovecha para descansar o bloquear tu horario"
                    : "No hay citas agendadas"}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 max-w-xs mx-auto">
                  <button
                    onClick={() => setBlockModal({ open: true })}
                    className="flex-1 rounded-xl bg-[#c87941] py-2.5 text-sm font-semibold text-white hover:bg-[#b56a35] transition shadow-sm"
                  >
                    Bloquear horario
                  </button>
                  <button
                    onClick={() => setView("calendar")}
                    className="flex-1 rounded-xl border border-[#e8e2dc] py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition"
                  >
                    Ver calendario
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {appointments.map((apt) => {
                const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.RESERVED;
                const isUpdating = updatingId === apt.id;
                return (
                  <div
                    key={apt.id}
                    className={`rounded-xl bg-white border overflow-hidden shadow-sm transition-opacity ${
                      apt.status === "CANCELED" ? "border-stone-200 opacity-50" : "border-[#e8e2dc]"
                    }`}
                  >
                    <div className="flex">
                      {/* Color accent strip */}
                      <div className="w-1 shrink-0 rounded-l-xl" style={{ backgroundColor: cfg.color }} />

                      <div className="flex-1 min-w-0">
                        {/* Card content */}
                        <div className="flex items-start justify-between px-3.5 pt-3 pb-2 gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Time block */}
                            <div className="text-center shrink-0 w-12">
                              <div className="text-sm font-black text-stone-800 leading-none">{formatTime(apt.start)}</div>
                              <div className="text-[10px] text-stone-400 mt-0.5">{formatTime(apt.end)}</div>
                            </div>
                            {/* Client info */}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-stone-800 truncate">{apt.clientName}</p>
                              <p className="text-xs text-stone-400 truncate">{apt.serviceName} · {apt.serviceDuration} min</p>
                              {apt.clientPhone && (
                                <a
                                  href={`https://wa.me/${apt.clientPhone.replace(/\D/g, "")}`}
                                  className="inline-flex items-center gap-1 mt-1 text-[11px] text-emerald-600 hover:text-emerald-700"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.31-.726-5.99-1.955l-.42-.312-3.072 1.03 1.03-3.072-.312-.42A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                                  WhatsApp
                                </a>
                              )}
                            </div>
                          </div>
                          {/* Status + price */}
                          <div className="text-right shrink-0">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                            <p className="text-sm font-bold text-stone-700 mt-1">{formatCLP(apt.price)}</p>
                          </div>
                        </div>

                        {/* Note */}
                        {apt.notePublic && (
                          <div className="px-3.5 pb-2">
                            <p className="text-[11px] text-stone-400 italic bg-stone-50 rounded-lg px-2.5 py-1.5">&ldquo;{apt.notePublic}&rdquo;</p>
                          </div>
                        )}

                        {/* Action buttons */}
                        {apt.status === "RESERVED" && (
                          <div className="border-t border-[#e8e2dc] grid grid-cols-2">
                            <button
                              onClick={() => updateStatus(apt.id, "DONE")}
                              disabled={isUpdating}
                              className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-50"
                            >
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                              Completar
                            </button>
                            <button
                              onClick={() => updateStatus(apt.id, "NO_SHOW")}
                              disabled={isUpdating}
                              className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 border-l border-[#e8e2dc] transition disabled:opacity-50"
                            >
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
                              No asistió
                            </button>
                          </div>
                        )}
                        {(apt.status === "DONE" || apt.status === "NO_SHOW") && !isPast(apt.start) && (
                          <div className="border-t border-[#e8e2dc]">
                            <button
                              onClick={() => updateStatus(apt.id, "RESERVED")}
                              disabled={isUpdating}
                              className="w-full py-2 text-xs font-medium text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition disabled:opacity-50"
                            >
                              Deshacer
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Block time CTA */}
          {!loading && appointments.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setBlockModal({ open: true })}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 py-3 text-sm font-medium text-stone-400 hover:border-[#c87941]/50 hover:text-[#c87941] hover:bg-[#c87941]/5 transition"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Bloquear horario
              </button>
            </div>
          )}
        </>
      )}

      {/* ═══════════════ CALENDAR VIEW ═══════════════ */}
      {view === "calendar" && (
        <div className="relative">
          <BarberCalendar
            events={calEvents}
            onSelectSlot={({ isoStart, isoEnd }) => setBlockModal({ open: true, start: isoStart, end: isoEnd })}
            onClickEvent={(event) => setEventAction({ event, x: 0, y: 0 })}
            onRangeChange={loadCalendarEvents}
          />
          <button
            onClick={() => setBlockModal({ open: true })}
            className="fixed bottom-20 right-4 z-20 flex items-center gap-2 rounded-full bg-[#c87941] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#c87941]/25 hover:bg-[#b56a35] transition lg:bottom-6"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Bloquear
          </button>
        </div>
      )}

      <div className="h-4" />

      {/* Block time modal */}
      {blockModal.open && (
        <BlockTimeModal
          defaultStart={blockModal.start}
          defaultEnd={blockModal.end}
          onClose={() => setBlockModal({ open: false })}
          onCreated={() => {
            setBlockModal({ open: false });
            if (view === "list") loadListAppointments();
            if (view === "calendar") setCalEvents([]);
          }}
        />
      )}

      {/* Event action popover */}
      {eventAction && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setEventAction(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {eventAction.event.kind === "BLOCK" ? (
              <>
                <div className="px-5 py-4 border-b border-[#e8e2dc] flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-stone-100 flex items-center justify-center">
                    <svg width="16" height="16" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900">{eventAction.event.title}</p>
                    <p className="text-xs text-stone-400">{formatTime(eventAction.event.start)} – {formatTime(eventAction.event.end)}</p>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <button
                    onClick={() => deleteBlock(eventAction.event.id)}
                    className="w-full rounded-xl bg-red-50 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition"
                  >
                    Eliminar bloqueo
                  </button>
                  <button
                    onClick={() => setEventAction(null)}
                    className="w-full rounded-xl border border-[#e8e2dc] py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-[#e8e2dc] flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg width="16" height="16" fill="none" stroke="#3B82F6" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900">{eventAction.event.title.split("\n")[0]}</p>
                    <p className="text-xs text-stone-400">
                      {eventAction.event.title.split("\n")[1]} · {formatTime(eventAction.event.start)} – {formatTime(eventAction.event.end)}
                    </p>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {eventAction.event.status === "RESERVED" && (
                    <>
                      <button
                        onClick={() => updateStatus(eventAction.event.id, "DONE")}
                        className="w-full rounded-xl bg-emerald-50 py-2.5 text-sm font-bold text-emerald-600 hover:bg-emerald-100 transition"
                      >
                        Marcar completado
                      </button>
                      <button
                        onClick={() => updateStatus(eventAction.event.id, "NO_SHOW")}
                        className="w-full rounded-xl bg-red-50 py-2.5 text-sm font-bold text-red-500 hover:bg-red-100 transition"
                      >
                        No asistió
                      </button>
                    </>
                  )}
                  {(eventAction.event.status === "DONE" || eventAction.event.status === "NO_SHOW") && (
                    <button
                      onClick={() => updateStatus(eventAction.event.id, "RESERVED")}
                      className="w-full rounded-xl bg-stone-50 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-100 transition"
                    >
                      Deshacer
                    </button>
                  )}
                  <button
                    onClick={() => setEventAction(null)}
                    className="w-full rounded-xl border border-[#e8e2dc] py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </BarberShell>
  );
}
