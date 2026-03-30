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

const STATUS_CONFIG = {
  RESERVED: { label: "Reservado", bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-400" },
  DONE:     { label: "Completado", bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400" },
  NO_SHOW:  { label: "No asistió", bg: "bg-red-50", text: "text-red-500", dot: "bg-red-400" },
  CANCELED: { label: "Cancelado", bg: "bg-stone-100", text: "text-stone-400", dot: "bg-stone-300" },
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

  // Block time modal state
  const [blockModal, setBlockModal] = useState<{ open: boolean; start?: string; end?: string }>({ open: false });

  // Event action popover (calendar)
  const [eventAction, setEventAction] = useState<EventAction | null>(null);

  const initials = barber
    ? barber.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  /* ── Fetch barber info + today stats ── */
  useEffect(() => {
    fetch("/api/barber/me")
      .then((r) => r.json())
      .then((d) => { setBarber(d.barber); setStats(d.stats); })
      .catch(() => {});
  }, []);

  /* ── Refresh stats ── */
  const refreshStats = useCallback(() => {
    fetch("/api/barber/me")
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, []);

  /* ── List view: load single-day appointments ── */
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

  /* ── Calendar view: load range ── */
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
          title: `🔒 ${b.reason}`,
          start: b.start,
          end: b.end,
          kind: "BLOCK" as const,
        })
      );

      setCalEvents([...aptEvents, ...blockEvents]);
    } catch {
      // Silently ignore network errors (e.g. server restarting)
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
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
        // Update calendar event too
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

  /* ── Delete block time ── */
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

  return (
    <BarberShell
      name={barber?.name ?? ""}
      initials={initials}
      view={view}
      onViewChange={setView}
    >
      {/* ═══════════════════════════════ LIST VIEW ═══════════════════════════════ */}
      {view === "list" && (
        <>
          {/* Date nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevDay} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 transition">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-stone-800 capitalize">{formatDateLabel(currentDate)}</p>
              {isToday(currentDate) && <p className="text-[10px] text-[#c87941] font-medium">Hoy</p>}
            </div>
            <button onClick={nextDay} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 transition">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>

          {/* Stats row (today only) */}
          {isToday(currentDate) && stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              <div className="rounded-xl bg-white border border-[#e8e2dc] p-3 text-center">
                <div className="text-xl font-extrabold text-stone-800">{stats.totalToday}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Citas</div>
              </div>
              <div className="rounded-xl bg-white border border-[#e8e2dc] p-3 text-center">
                <div className="text-xl font-extrabold text-emerald-600">{stats.doneToday}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Completadas</div>
              </div>
              <div className="rounded-xl bg-white border border-[#e8e2dc] p-3 text-center">
                <div className="text-xl font-extrabold text-[#c87941]">{formatCLP(stats.revenueToday)}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Cobrado</div>
              </div>
            </div>
          )}

          {/* Appointment cards */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl bg-white border border-[#e8e2dc] p-4 animate-pulse">
                  <div className="flex gap-3 items-center mb-3">
                    <div className="h-10 w-10 rounded-full bg-stone-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-stone-100 rounded w-32" />
                      <div className="h-3 bg-stone-100 rounded w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="rounded-2xl border border-[#e8e2dc] bg-white overflow-hidden">
              {/* Illustration strip */}
              <div className="h-1.5 bg-gradient-to-r from-[#c87941] via-[#d4a34a] to-[#c87941]/40" />
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#c87941]/10">
                  <svg width="28" height="28" fill="none" stroke="#c87941" strokeWidth="1.6" viewBox="0 0 24 24">
                    <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
                    <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
                  </svg>
                </div>
                <p className="text-base font-bold text-stone-800">
                  {isToday(currentDate) ? "Sin citas por hoy" : "Sin citas este día"}
                </p>
                <p className="text-sm text-stone-400 mt-1 mb-5">
                  {isToday(currentDate)
                    ? "Aprovecha para descansar o bloquear tu horario"
                    : "No hay citas agendadas para este día"}
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setBlockModal({ open: true })}
                    className="w-full rounded-xl bg-[#c87941] py-2.5 text-sm font-semibold text-white hover:bg-[#b56a35] transition"
                  >
                    Bloquear horario
                  </button>
                  <button
                    onClick={() => setView("calendar")}
                    className="w-full rounded-xl border border-[#e8e2dc] py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition"
                  >
                    Ver en calendario
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => {
                const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.RESERVED;
                const isUpdating = updatingId === apt.id;
                return (
                  <div
                    key={apt.id}
                    className={`rounded-xl bg-white border overflow-hidden ${
                      apt.status === "CANCELED" ? "border-[#e8e2dc] opacity-60" : "border-[#e8e2dc]"
                    }`}
                  >
                    <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className="text-lg font-extrabold text-stone-800 leading-none">{formatTime(apt.start)}</div>
                          <div className="text-[10px] text-stone-400 mt-0.5">{formatTime(apt.end)}</div>
                        </div>
                        <div className="h-8 w-px bg-[#e8e2dc]" />
                        <div>
                          <p className="text-sm font-semibold text-stone-800 leading-tight">{apt.clientName}</p>
                          {apt.clientPhone && (
                            <a href={`https://wa.me/${apt.clientPhone.replace(/\D/g, "")}`} className="text-[11px] text-[#c87941] hover:underline">
                              {apt.clientPhone}
                            </a>
                          )}
                        </div>
                      </div>
                      <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="px-4 pb-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-stone-500">{apt.serviceName} · {apt.serviceDuration} min</p>
                        {apt.notePublic && (
                          <p className="text-[11px] text-stone-400 mt-0.5 italic">&ldquo;{apt.notePublic}&rdquo;</p>
                        )}
                      </div>
                      <span className="text-sm font-bold text-stone-700">{formatCLP(apt.price)}</span>
                    </div>
                    {apt.status === "RESERVED" && (
                      <div className="border-t border-[#e8e2dc] grid grid-cols-2">
                        <button
                          onClick={() => updateStatus(apt.id, "DONE")}
                          disabled={isUpdating}
                          className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-50"
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                          Completar
                        </button>
                        <button
                          onClick={() => updateStatus(apt.id, "NO_SHOW")}
                          disabled={isUpdating}
                          className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 border-l border-[#e8e2dc] transition disabled:opacity-50"
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
                          className="w-full py-2 text-[11px] font-medium text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition disabled:opacity-50"
                        >
                          Deshacer
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Block time shortcut */}
          <div className="mt-4">
            <button
              onClick={() => setBlockModal({ open: true })}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#e8e2dc] py-3 text-sm font-medium text-stone-400 hover:border-[#c87941]/40 hover:text-[#c87941] transition"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Bloquear horario
            </button>
          </div>
        </>
      )}

      {/* ═══════════════════════════════ CALENDAR VIEW ═══════════════════════════ */}
      {view === "calendar" && (
        <div className="relative">
          <BarberCalendar
            events={calEvents}
            onSelectSlot={({ isoStart, isoEnd }) => setBlockModal({ open: true, start: isoStart, end: isoEnd })}
            onClickEvent={(event) => setEventAction({ event, x: 0, y: 0 })}
            onRangeChange={loadCalendarEvents}
          />
          {/* FAB — Bloquear horario */}
          <button
            onClick={() => setBlockModal({ open: true })}
            className="fixed bottom-20 right-4 z-20 flex items-center gap-2 rounded-full bg-[#c87941] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#c87941]/30 hover:bg-[#b56a35] transition lg:bottom-6"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Bloquear
          </button>
        </div>
      )}

      <div className="h-4" />

      {/* ═══════════════════════════════ BLOCK TIME MODAL ════════════════════════ */}
      {blockModal.open && (
        <BlockTimeModal
          defaultStart={blockModal.start}
          defaultEnd={blockModal.end}
          onClose={() => setBlockModal({ open: false })}
          onCreated={() => {
            setBlockModal({ open: false });
            if (view === "list") {
              loadListAppointments();
            }
            // Calendar will reload on next datesSet; force refresh by clearing events temporarily
            if (view === "calendar") {
              setCalEvents([]);
            }
          }}
        />
      )}

      {/* ═══════════════════════════════ EVENT ACTION POPOVER ════════════════════ */}
      {eventAction && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setEventAction(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {eventAction.event.kind === "BLOCK" ? (
              <>
                <div className="px-5 py-4 border-b border-[#e8e2dc]">
                  <p className="text-base font-bold text-stone-900">{eventAction.event.title.replace("🔒 ", "")}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {formatTime(eventAction.event.start)} – {formatTime(eventAction.event.end)}
                  </p>
                </div>
                <div className="p-4 space-y-2">
                  <button
                    onClick={() => deleteBlock(eventAction.event.id)}
                    className="w-full rounded-lg bg-red-50 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition"
                  >
                    Eliminar bloqueo
                  </button>
                  <button
                    onClick={() => setEventAction(null)}
                    className="w-full rounded-lg border border-[#e8e2dc] py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-[#e8e2dc]">
                  <p className="text-base font-bold text-stone-900">{eventAction.event.title.split("\n")[0]}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {eventAction.event.title.split("\n")[1]} · {formatTime(eventAction.event.start)} – {formatTime(eventAction.event.end)}
                  </p>
                </div>
                <div className="p-4 space-y-2">
                  {eventAction.event.status === "RESERVED" && (
                    <>
                      <button
                        onClick={() => updateStatus(eventAction.event.id, "DONE")}
                        className="w-full rounded-lg bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-100 transition"
                      >
                        ✓ Marcar completado
                      </button>
                      <button
                        onClick={() => updateStatus(eventAction.event.id, "NO_SHOW")}
                        className="w-full rounded-lg bg-red-50 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-100 transition"
                      >
                        ✗ No asistió
                      </button>
                    </>
                  )}
                  {(eventAction.event.status === "DONE" || eventAction.event.status === "NO_SHOW") && (
                    <button
                      onClick={() => updateStatus(eventAction.event.id, "RESERVED")}
                      className="w-full rounded-lg bg-stone-50 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100 transition"
                    >
                      ↩ Deshacer
                    </button>
                  )}
                  <button
                    onClick={() => setEventAction(null)}
                    className="w-full rounded-lg border border-[#e8e2dc] py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition"
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
