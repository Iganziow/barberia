"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import BarberShell from "@/features/barber/layout/BarberShell";
import BlockTimeModal from "@/features/barber/BlockTimeModal";
import SlotMinutesPicker from "@/features/admin/agenda/SlotMinutesPicker";
import MiniMonthCalendar from "@/features/admin/agenda/MiniMonthCalendar";
import { useSlotMinutes } from "@/hooks/use-slot-minutes";
import type { CalendarEvent } from "@/features/barber/BarberCalendar";

const BarberCalendar = dynamic(() => import("@/features/barber/BarberCalendar"), { ssr: false });

import { formatCLP, formatTime } from "@/lib/format";
import { STATUS_CONFIG } from "@/lib/constants";

type Stats = {
  totalToday: number;
  doneToday: number;
  pendingToday: number;
  revenueToday: number;
};
type BarberInfo = {
  id: string;
  name: string;
  color: string | null;
  phone?: string | null;
  commissionType?: "PERCENTAGE" | "FIXED";
  commissionValue?: number;
};
type MonthStats = {
  revenue: number;
  tips: number;
  paidCount: number;
  completed: number;
  commissionEarned: number;
  commissionDeltaPct: number | null;
  avgTicket: number;
};

type ClientNote = {
  id: string;
  date: string;
  status: string;
  serviceName: string;
  note: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function relativeInMinutes(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "ahora";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `en ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m > 0 ? `en ${h}h ${m}min` : `en ${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "mañana" : `en ${d} días`;
}

// Filtros disponibles por status (shortcut: "active" = lo que todavía
// necesita atención, excluye CANCELED/NO_SHOW/DONE ya cerradas)
type StatusFilter = "all" | "pending" | "done" | "active";

// ─── Icons ──────────────────────────────────────────────────────────────
function IconLock() { return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>; }
function IconNote() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>; }
function IconWhatsApp() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.31-.726-5.99-1.955l-.42-.312-3.072 1.03 1.03-3.072-.312-.42A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /></svg>; }
function IconPhone() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>; }
function IconSearch() { return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>; }
function IconUser() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 22c0-4 3-7 8-7s8 3 8 7" /></svg>; }
function IconX() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>; }
function IconClock() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>; }

// ─── Componente principal ───────────────────────────────────────────────
export default function BarberPage() {
  const [barber, setBarber] = useState<BarberInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [blockModal, setBlockModal] = useState<{ open: boolean; start?: string; end?: string }>({ open: false });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Cancel flow: cuando el barbero clickea "Cancelar", aparece un input
  // para el motivo antes de enviar el PATCH (igual que el modal del admin).
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Filtro de status (oculta CANCELED por defecto — ruido visual)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Ctrl+K search
  const [searchOpen, setSearchOpen] = useState(false);

  // Edit profile
  const [profileOpen, setProfileOpen] = useState(false);

  // Slot minutes (granularidad del calendar)
  const { slotMinutes, setSlotMinutes } = useSlotMinutes();

  // Fecha seleccionada en los mini-calendarios del sidebar. Cuando cambia,
  // BarberCalendar navega via gotoDate(). Inicializa en hoy.
  const [sidebarDate, setSidebarDate] = useState<Date>(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  });
  const nextMonthDate = useMemo(() => {
    const d = new Date(sidebarDate);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    return d;
  }, [sidebarDate]);

  // Notas: estado del modal de detalle
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [clientNotes, setClientNotes] = useState<ClientNote[] | null>(null);
  const [loadingClientNotes, setLoadingClientNotes] = useState(false);

  const initials = barber
    ? barber.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  // ─── Data fetching ────────────────────────────────────────────────
  const refreshMe = useCallback(() => {
    fetch("/api/barber/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setBarber(d.barber);
          setStats(d.stats);
          if (d.month) setMonthStats(d.month);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const refreshStats = useCallback(() => {
    fetch("/api/barber/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setStats(d.stats);
          if (d.month) setMonthStats(d.month);
        }
      })
      .catch(() => {});
  }, []);

  const loadCalendarEvents = useCallback(async (from: string, to: string) => {
    try {
      const [aptsRes, blocksRes] = await Promise.all([
        fetch(`/api/barber/appointments?from=${from}&to=${to}`)
          .then((r) => (r.ok ? r.json() : { appointments: [] }))
          .catch(() => ({ appointments: [] })),
        fetch(`/api/barber/block-times?from=${from}&to=${to}`)
          .then((r) => (r.ok ? r.json() : { blockTimes: [] }))
          .catch(() => ({ blockTimes: [] })),
      ]);
      type AptRaw = {
        id: string; clientId: string; clientName: string; clientPhone: string | null;
        serviceName: string; serviceDuration: number; start: string; end: string;
        status: string; price: number; notePublic: string | null; noteInternal: string | null;
        paid: boolean;
      };
      const aptEvents: CalendarEvent[] = (aptsRes.appointments || []).map((a: AptRaw) => ({
        id: a.id, title: `${a.clientName}\n${a.serviceName}`, start: a.start, end: a.end,
        kind: "APPOINTMENT" as const, status: a.status,
        clientId: a.clientId, clientName: a.clientName, clientPhone: a.clientPhone,
        serviceName: a.serviceName, serviceDuration: a.serviceDuration, price: a.price,
        notePublic: a.notePublic, noteInternal: a.noteInternal, paid: a.paid,
      }));
      const blockEvents: CalendarEvent[] = (blocksRes.blockTimes || []).map(
        (b: { id: string; reason: string; start: string; end: string }) => ({
          id: b.id, title: b.reason, start: b.start, end: b.end, kind: "BLOCK" as const,
        })
      );
      setCalEvents([...aptEvents, ...blockEvents]);
    } catch {
      /* ignore */
    }
  }, []);

  // ─── Filtrado en memoria del calendario ────────────────────────────
  const filteredEvents = useMemo(() => {
    if (statusFilter === "all") return calEvents;
    return calEvents.filter((e) => {
      if (e.kind === "BLOCK") return true; // bloques siempre visibles
      if (statusFilter === "pending") return e.status === "RESERVED" || e.status === "CONFIRMED";
      if (statusFilter === "done") return e.status === "DONE";
      if (statusFilter === "active") {
        return e.status !== "CANCELED" && e.status !== "NO_SHOW";
      }
      return true;
    });
  }, [calEvents, statusFilter]);

  // ─── Próximas 3 citas (entre ahora y las próximas 48h, no canceladas) ─
  const upcomingNext = useMemo(() => {
    const now = Date.now();
    const cutoff = now + 48 * 60 * 60 * 1000;
    return calEvents
      .filter(
        (e) =>
          e.kind === "APPOINTMENT" &&
          new Date(e.start).getTime() > now &&
          new Date(e.start).getTime() < cutoff &&
          e.status !== "CANCELED" &&
          e.status !== "NO_SHOW" &&
          e.status !== "DONE"
      )
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 3);
  }, [calEvents]);

  // ─── Cuando se abre un evento, cargar historial de notas del cliente ─
  useEffect(() => {
    if (!selectedEvent || selectedEvent.kind !== "APPOINTMENT" || !selectedEvent.clientId) {
      setClientNotes(null);
      return;
    }
    setNoteInput(selectedEvent.noteInternal || "");
    setNoteSaved(false);
    setEditingNote(false);
    setShowCancelInput(false);
    setCancelReason("");
    setLoadingClientNotes(true);
    fetch(`/api/barber/clients/${selectedEvent.clientId}/notes`)
      .then((r) => (r.ok ? r.json() : { notes: [] }))
      .then((d) => {
        const filtered = (d.notes || []).filter((n: ClientNote) => n.id !== selectedEvent.id);
        setClientNotes(filtered);
      })
      .catch(() => setClientNotes([]))
      .finally(() => setLoadingClientNotes(false));
  }, [selectedEvent]);

  // ─── Ctrl+K shortcut ─────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ─── Status change con optimistic UI ─────────────────────────────
  type NextStatus = "RESERVED" | "ARRIVED" | "IN_PROGRESS" | "DONE" | "NO_SHOW" | "CANCELED";

  async function updateStatus(id: string, status: NextStatus, reason?: string) {
    if (status === "NO_SHOW" && !window.confirm("¿Marcar como no asistió?")) return;

    // Optimistic update: cambiamos antes de esperar al backend
    const prevEvents = calEvents;
    const prevSelected = selectedEvent;
    setCalEvents((curr) => curr.map((e) => (e.id === id ? { ...e, status } : e)));
    if (selectedEvent?.id === id) {
      setSelectedEvent((prev) => (prev ? { ...prev, status } : null));
    }

    setUpdatingId(id);
    try {
      const payload: Record<string, unknown> = { status };
      if (status === "CANCELED" && reason && reason.trim()) {
        payload.cancelReason = reason.trim();
      }
      const res = await fetch(`/api/barber/appointments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        // Reset del input de cancelación si estaba abierto
        setShowCancelInput(false);
        setCancelReason("");
        refreshStats();
      } else {
        setCalEvents(prevEvents);
        setSelectedEvent(prevSelected);
        alert("No se pudo actualizar el estado. Intenta de nuevo.");
      }
    } catch {
      setCalEvents(prevEvents);
      setSelectedEvent(prevSelected);
      alert("Error de conexión al actualizar.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function saveNote() {
    if (!selectedEvent || selectedEvent.kind !== "APPOINTMENT") return;
    setSavingNote(true);
    setNoteSaved(false);
    try {
      const res = await fetch(`/api/barber/appointments/${selectedEvent.id}/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteInternal: noteInput.trim() || null }),
      });
      if (res.ok) {
        const updated = { ...selectedEvent, noteInternal: noteInput.trim() || null };
        setSelectedEvent(updated);
        setCalEvents((prev) =>
          prev.map((e) => (e.id === selectedEvent.id ? { ...e, noteInternal: noteInput.trim() || null } : e))
        );
        setNoteSaved(true);
        setEditingNote(false);
        setTimeout(() => setNoteSaved(false), 2500);
      }
    } finally {
      setSavingNote(false);
    }
  }

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

  // FAB oculto mientras hay otro modal abierto (evita solaparse)
  const anyModalOpen = !!ev || blockModal.open || searchOpen || profileOpen;

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <BarberShell name={barber?.name ?? ""} initials={initials}>
      <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-5">
      {/* ── Sidebar con mini-calendarios (solo desktop) ────────────── */}
      <aside className="hidden lg:flex flex-col gap-4 sticky top-20 self-start max-h-[calc(100vh-90px)] overflow-y-auto pr-1">
        <div className="rounded-xl border border-[#e8e2dc] bg-white p-3 shadow-sm">
          <MiniMonthCalendar
            selectedDate={sidebarDate}
            onSelectDate={(d) => setSidebarDate(d)}
          />
        </div>
        <div className="rounded-xl border border-[#e8e2dc] bg-white p-3 shadow-sm opacity-90">
          {/* Mismo selectedDate (sidebarDate) pero arranca en el mes
              siguiente. Si el día seleccionado cae en este mes, también
              lo resalta correctamente. */}
          <MiniMonthCalendar
            selectedDate={sidebarDate}
            initialMonth={nextMonthDate}
            onSelectDate={(d) => setSidebarDate(d)}
          />
        </div>
        {/* Quick action: volver a hoy */}
        <button
          type="button"
          onClick={() => {
            const t = new Date();
            t.setHours(0, 0, 0, 0);
            setSidebarDate(t);
          }}
          className="rounded-lg border border-[#e8e2dc] bg-white px-3 py-2 text-xs font-semibold text-stone-600 hover:border-brand/40 hover:text-brand transition"
        >
          Volver a hoy
        </button>
      </aside>

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="min-w-0">
      {/* ── Stats bar ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <div className="rounded-xl bg-white border border-[#e8e2dc] p-3 shadow-sm" style={{ borderLeftWidth: 3, borderLeftColor: "#3B82F6" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Citas hoy</p>
            <p className="text-xl font-extrabold text-stone-900 mt-0.5 tabular-nums">{stats.totalToday}</p>
          </div>
          <div className="rounded-xl bg-white border border-[#e8e2dc] p-3 shadow-sm" style={{ borderLeftWidth: 3, borderLeftColor: "#F59E0B" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Pendientes</p>
            <p className="text-xl font-extrabold text-stone-900 mt-0.5 tabular-nums">{stats.pendingToday}</p>
          </div>
          <div className="rounded-xl bg-white border border-[#e8e2dc] p-3 shadow-sm" style={{ borderLeftWidth: 3, borderLeftColor: "#10B981" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Listas</p>
            <p className="text-xl font-extrabold text-emerald-600 mt-0.5 tabular-nums">{stats.doneToday}</p>
          </div>
          <div className="rounded-xl bg-white border border-[#e8e2dc] p-3 shadow-sm" style={{ borderLeftWidth: 3, borderLeftColor: "#c87941" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Cobrado</p>
            <p className="text-xl font-extrabold text-brand mt-0.5 tabular-nums">{formatCLP(stats.revenueToday)}</p>
          </div>
        </div>
      )}

      {/* ── Card "Mi mes": comisión acumulada + revenue ── */}
      {monthStats && barber && (
        <section className="rounded-xl border border-[#e8e2dc] bg-gradient-to-br from-brand/[0.06] via-white to-white shadow-sm p-4 sm:p-5 mb-4 overflow-hidden relative">
          {/* Decorative corner glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand/10 blur-3xl pointer-events-none" aria-hidden />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
                Tu mes
              </p>
              <div className="flex items-baseline gap-3 mt-1 flex-wrap">
                <p className="text-3xl sm:text-4xl font-extrabold text-stone-900 tabular-nums leading-none">
                  {formatCLP(monthStats.commissionEarned)}
                </p>
                {monthStats.commissionDeltaPct !== null && (
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      monthStats.commissionDeltaPct >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {monthStats.commissionDeltaPct >= 0 ? "↑" : "↓"} {Math.abs(monthStats.commissionDeltaPct)}% vs mes pasado
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Comisión estimada · {" "}
                {barber.commissionType === "PERCENTAGE"
                  ? `${barber.commissionValue ?? 0}% de los ingresos`
                  : `${formatCLP(barber.commissionValue ?? 0)} por cita completada`}
              </p>
            </div>
            {/* Mini breakdown de la derecha */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6 sm:border-l sm:border-stone-200 sm:pl-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400">Ingresos</p>
                <p className="text-sm font-bold text-stone-900 mt-0.5 tabular-nums">
                  {formatCLP(monthStats.revenue)}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400">Completadas</p>
                <p className="text-sm font-bold text-stone-900 mt-0.5 tabular-nums">
                  {monthStats.completed}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400">Propinas</p>
                <p className="text-sm font-bold text-emerald-600 mt-0.5 tabular-nums">
                  {formatCLP(monthStats.tips)}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Próximas citas (card inicial) ── */}
      {upcomingNext.length > 0 && (
        <section className="rounded-xl border border-brand/20 bg-brand/5 p-3 sm:p-4 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-2">
            <IconClock />
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
              Próximas citas
            </p>
          </div>
          <div className="divide-y divide-brand/10">
            {upcomingNext.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedEvent(a)}
                className="w-full text-left py-2.5 flex items-center gap-3 hover:bg-white/40 -mx-3 px-3 transition rounded"
              >
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-stone-900 tabular-nums">{formatTime(a.start)}</p>
                  <p className="text-[10px] text-brand font-semibold">{relativeInMinutes(a.start)}</p>
                </div>
                <div className="h-8 w-px bg-brand/20 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-900 truncate">{a.clientName}</p>
                  <p className="text-xs text-stone-500 truncate">{a.serviceName} · {a.serviceDuration} min</p>
                </div>
                {a.noteInternal && (
                  <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-semibold">
                    <IconNote />
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Toolbar del calendario ── */}
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            { v: "all", label: "Todas" },
            { v: "active", label: "Activas" },
            { v: "pending", label: "Pendientes" },
            { v: "done", label: "Completadas" },
          ] as const).map((f) => (
            <button
              key={f.v}
              onClick={() => setStatusFilter(f.v)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                statusFilter === f.v
                  ? "bg-brand text-white shadow-sm"
                  : "bg-white border border-[#e8e2dc] text-stone-500 hover:border-brand/30 hover:text-stone-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#e8e2dc] bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:border-brand/40 hover:text-brand transition"
            title="Buscar cliente (Ctrl+K)"
          >
            <IconSearch />
            <span className="hidden sm:inline">Buscar</span>
            <kbd className="hidden sm:inline-flex text-[9px] font-semibold bg-stone-100 border border-stone-200 rounded px-1 py-0.5 text-stone-500">Ctrl+K</kbd>
          </button>
          <button
            onClick={() => setProfileOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#e8e2dc] bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:border-brand/40 hover:text-brand transition"
            title="Editar mi perfil"
          >
            <IconUser />
            <span className="hidden sm:inline">Perfil</span>
          </button>
          <SlotMinutesPicker value={slotMinutes} onChange={setSlotMinutes} />
        </div>
      </div>

      {/* ── Calendar ── */}
      <section className="rounded-xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
        <div className="p-1 sm:p-2">
          <BarberCalendar
            events={filteredEvents}
            onSelectSlot={({ isoStart, isoEnd }) => {
              setSelectedEvent(null);
              setBlockModal({ open: true, start: isoStart, end: isoEnd });
            }}
            onClickEvent={(event) => setSelectedEvent(event)}
            onRangeChange={loadCalendarEvents}
            slotMinutes={slotMinutes}
            currentDate={sidebarDate}
          />
        </div>
      </section>

      </div>{/* end main content (col 2) */}
      </div>{/* end grid wrapper */}

      {/* ── FAB: bloquear tiempo — oculto cuando hay modal abierto ── */}
      {!anyModalOpen && (
        <button
          onClick={() => setBlockModal({ open: true })}
          className="fixed bottom-6 right-6 z-20 flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand/25 hover:bg-brand-hover transition"
        >
          <IconLock />
          Bloquear
        </button>
      )}

      {/* ── Event detail modal ── */}
      {ev && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="h-1.5"
              style={{ backgroundColor: ev.kind === "BLOCK" ? "#a8a29e" : evCfg?.color ?? "#c87941" }}
            />

            {ev.kind === "BLOCK" ? (
              <div className="p-5">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Bloqueo</p>
                <p className="text-base font-bold text-stone-900">{ev.title}</p>
                <p className="text-xs text-stone-500 mt-1">
                  {formatDate(ev.start)} · {formatTime(ev.start)} – {formatTime(ev.end)}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button onClick={() => deleteBlock(ev.id)} className="rounded-xl bg-red-50 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition">Eliminar</button>
                  <button onClick={() => setSelectedEvent(null)} className="rounded-xl border border-[#e8e2dc] py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition">Cerrar</button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-5 overflow-y-auto flex-1">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-stone-900 truncate">{ev.clientName ?? ev.title.split("\n")[0]}</p>
                      <p className="text-xs text-stone-500 mt-0.5 truncate">
                        {ev.serviceName ?? ev.title.split("\n")[1]}
                        {ev.serviceDuration ? ` · ${ev.serviceDuration} min` : ""}
                      </p>
                    </div>
                    {evCfg && (
                      <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${evCfg.bg} ${evCfg.text}`}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: evCfg.color }} />
                        {evCfg.label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm mb-4 pb-3 border-b border-[#f0ece8]">
                    <span className="text-stone-500">{formatDate(ev.start)} · {formatTime(ev.start)} – {formatTime(ev.end)}</span>
                    {ev.price !== undefined && (
                      <span className="font-bold text-stone-900 tabular-nums">
                        {formatCLP(ev.price)}
                        {ev.paid && <span className="ml-1.5 text-[10px] text-emerald-600 font-semibold">✓ pagado</span>}
                      </span>
                    )}
                  </div>

                  {/* Contact: WhatsApp + tel: link */}
                  {ev.clientPhone && (
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <a
                        href={`https://wa.me/${ev.clientPhone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        <IconWhatsApp />
                        WhatsApp
                      </a>
                      <a
                        href={`tel:${ev.clientPhone.replace(/\s/g, "")}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200 transition"
                      >
                        <IconPhone />
                        Llamar
                      </a>
                      <span className="text-xs font-mono text-stone-500 tabular-nums">
                        {ev.clientPhone}
                      </span>
                    </div>
                  )}

                  {ev.notePublic && (
                    <div className="mb-4 rounded-xl bg-stone-50 border border-[#e8e2dc] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-1">Mensaje del cliente</p>
                      <p className="text-sm text-stone-700">{ev.notePublic}</p>
                    </div>
                  )}

                  {clientNotes && clientNotes.length > 0 && (
                    <div className="mb-4 rounded-xl bg-brand/5 border border-brand/20 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-brand"><IconNote /></span>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
                          Historial de {ev.clientName?.split(" ")[0]} · {clientNotes.length} nota{clientNotes.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <ol className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                        {clientNotes.map((n) => (
                          <li key={n.id} className="border-l-2 border-brand/40 pl-3">
                            <p className="text-[10px] text-stone-500 mb-0.5">
                              <span className="capitalize font-semibold text-stone-600">{formatShortDate(n.date)}</span> · {n.serviceName}
                            </p>
                            <p className="text-xs text-stone-700 whitespace-pre-wrap leading-snug">{n.note}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {loadingClientNotes && (
                    <p className="text-[11px] text-stone-400 mb-4 italic">Buscando notas pasadas del cliente…</p>
                  )}

                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 flex items-center gap-1.5">
                        <IconNote />
                        Nota de esta cita
                      </p>
                      {ev.noteInternal && !editingNote && (
                        <button type="button" onClick={() => setEditingNote(true)} className="text-[11px] font-semibold text-amber-700 hover:text-amber-900">Editar</button>
                      )}
                    </div>
                    {ev.noteInternal && !editingNote ? (
                      <p className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">{ev.noteInternal}</p>
                    ) : (
                      <>
                        <textarea
                          className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 resize-y min-h-[70px]"
                          value={noteInput}
                          onChange={(e) => { setNoteInput(e.target.value); setNoteSaved(false); }}
                          placeholder="Ej: Pidió tapper fade, degradado bajo."
                          maxLength={2000}
                        />
                        <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                          <p className="text-[10px] text-stone-500 leading-snug">Para recordar qué te pidió la próxima vez</p>
                          <div className="flex items-center gap-2">
                            {noteSaved && <span className="text-[11px] text-emerald-700 font-semibold">✓ Guardada</span>}
                            {ev.noteInternal && editingNote && (
                              <button type="button" onClick={() => { setNoteInput(ev.noteInternal || ""); setEditingNote(false); }} className="text-xs font-medium text-stone-500 hover:text-stone-800">Cancelar</button>
                            )}
                            <button
                              type="button"
                              onClick={saveNote}
                              disabled={savingNote || noteInput.trim() === (ev.noteInternal || "")}
                              className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {savingNote ? "Guardando..." : "Guardar"}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Cancel reason input — aparece cuando el barbero pulsa "Cancelar" */}
                {showCancelInput && (
                  <div className="border-t border-red-100 bg-red-50/60 p-4 space-y-2 shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-700">
                      Motivo de cancelación
                    </p>
                    <textarea
                      className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200 resize-y min-h-[60px]"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Ej: Cliente avisó que no podía venir, reagendó por teléfono…"
                      maxLength={500}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end flex-wrap">
                      <button
                        onClick={() => { setShowCancelInput(false); setCancelReason(""); }}
                        className="rounded-lg border border-[#e8e2dc] bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition"
                      >
                        Volver
                      </button>
                      <button
                        onClick={() => updateStatus(ev.id, "CANCELED", cancelReason)}
                        disabled={isUpdating}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50"
                      >
                        {isUpdating ? "Cancelando..." : "Confirmar cancelación"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Status action buttons — flow granular igual que el admin */}
                {!showCancelInput && (
                  <div className="border-t border-[#f0ece8] bg-stone-50/40 p-4 shrink-0 space-y-2">
                    {/* Línea principal de avance — botón grande destacado según estado actual */}
                    {ev.status === "RESERVED" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          onClick={() => updateStatus(ev.id, "ARRIVED")}
                          disabled={isUpdating}
                          className="rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition disabled:opacity-50 shadow-sm shadow-blue-500/20"
                        >
                          Marcar llegó
                        </button>
                        <button
                          onClick={() => updateStatus(ev.id, "DONE")}
                          disabled={isUpdating}
                          className="rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                        >
                          Completar cita
                        </button>
                      </div>
                    )}
                    {ev.status === "ARRIVED" && (
                      <button
                        onClick={() => updateStatus(ev.id, "IN_PROGRESS")}
                        disabled={isUpdating}
                        className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition disabled:opacity-50 shadow-sm shadow-violet-500/20"
                      >
                        Empezar corte
                      </button>
                    )}
                    {ev.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => updateStatus(ev.id, "DONE")}
                        disabled={isUpdating}
                        className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                      >
                        Completar cita
                      </button>
                    )}
                    {(ev.status === "DONE" || ev.status === "NO_SHOW" || ev.status === "CANCELED") && (
                      <button
                        onClick={() => updateStatus(ev.id, "RESERVED")}
                        disabled={isUpdating}
                        className="w-full rounded-xl bg-stone-100 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-200 transition disabled:opacity-50"
                      >
                        Deshacer · volver a pendiente
                      </button>
                    )}

                    {/* Acciones secundarias (No asistió / Cancelar / Cerrar) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(ev.status === "RESERVED" || ev.status === "ARRIVED") && (
                        <>
                          <button
                            onClick={() => updateStatus(ev.id, "NO_SHOW")}
                            disabled={isUpdating}
                            className="rounded-xl bg-red-50 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                          >
                            No asistió
                          </button>
                          <button
                            onClick={() => { setShowCancelInput(true); setCancelReason(""); }}
                            disabled={isUpdating}
                            className="rounded-xl border border-red-200 bg-white py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                          >
                            Cancelar…
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedEvent(null)}
                        className="rounded-xl border border-[#e8e2dc] bg-white py-2 text-xs font-medium text-stone-500 hover:bg-stone-50 transition col-span-2 sm:col-span-1"
                      >
                        Cerrar
                      </button>
                    </div>

                    {/* Motivo de cancelación si ya existe */}
                    {ev.status === "CANCELED" && (
                      <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                        <p className="font-semibold mb-0.5">Motivo de cancelación</p>
                        <p className="text-red-600">Se guardó al cancelar · revisa desde la ficha del cliente si necesitas más contexto.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

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

      {/* ── Search modal ── */}
      {searchOpen && <ClientSearchModal onClose={() => setSearchOpen(false)} />}

      {/* ── Profile modal ── */}
      {profileOpen && barber && (
        <ProfileEditModal
          barber={barber}
          onClose={() => setProfileOpen(false)}
          onSaved={() => { setProfileOpen(false); refreshMe(); }}
        />
      )}
    </BarberShell>
  );
}

// ─── Client search modal (Ctrl+K) ──────────────────────────────────────
function ClientSearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string; phone: string | null; email: string | null; visits: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, ClientNote[] | null>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (q.trim().length < 2) {
      // Limpiar resultados usando la función callback para evitar
      // el lint de React 19 "setState synchronously in effect" — el
      // callback difiere el set hasta commit.
      const t = setTimeout(() => setResults((prev) => (prev.length === 0 ? prev : [])), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/barber/clients/search?q=${encodeURIComponent(q.trim())}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : { clients: [] }))
        .then((d) => setResults(d.clients || []))
        .catch((err) => {
          if (err?.name !== "AbortError") setResults([]);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q]);

  async function expandClient(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!notes[id]) {
      const r = await fetch(`/api/barber/clients/${id}/notes`);
      const d = r.ok ? await r.json() : { notes: [] };
      setNotes((prev) => ({ ...prev, [id]: d.notes || [] }));
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-20 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e8e2dc]">
          <IconSearch />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente por nombre, teléfono o email…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
          <button onClick={onClose} className="grid place-items-center h-6 w-6 rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Cerrar">
            <IconX />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="text-center text-stone-400 text-sm py-8">Buscando…</p>}
          {!loading && q.trim().length < 2 && (
            <p className="text-center text-stone-400 text-sm py-8">Escribe al menos 2 letras para buscar</p>
          )}
          {!loading && q.trim().length >= 2 && results.length === 0 && (
            <p className="text-center text-stone-400 text-sm py-8">Sin resultados para &quot;{q}&quot;</p>
          )}
          {!loading && results.length > 0 && (
            <ol className="divide-y divide-[#f0ece8]">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => expandClient(c.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition text-left"
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-brand text-xs font-bold shrink-0">
                      {c.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-900 truncate">{c.name}</p>
                      <p className="text-xs text-stone-500 truncate tabular-nums">
                        {c.phone || "—"} · {c.visits} visita{c.visits !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </button>
                  {expandedId === c.id && (
                    <div className="px-4 pb-4 bg-brand/5 border-t border-brand/10">
                      {notes[c.id] === undefined && (
                        <p className="py-3 text-xs text-stone-400 italic">Cargando notas…</p>
                      )}
                      {notes[c.id]?.length === 0 && (
                        <p className="py-3 text-xs text-stone-400 italic">Sin notas previas con este cliente</p>
                      )}
                      {notes[c.id] && notes[c.id]!.length > 0 && (
                        <ol className="space-y-2 pt-3">
                          {notes[c.id]!.map((n) => (
                            <li key={n.id} className="border-l-2 border-brand/40 pl-3">
                              <p className="text-[10px] text-stone-500 mb-0.5">
                                <span className="capitalize font-semibold text-stone-600">
                                  {new Date(n.date).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                                {" · "}
                                {n.serviceName}
                              </p>
                              <p className="text-xs text-stone-700 whitespace-pre-wrap leading-snug">{n.note}</p>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Profile edit modal ────────────────────────────────────────────────
function ProfileEditModal({
  barber,
  onClose,
  onSaved,
}: {
  barber: BarberInfo;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [phone, setPhone] = useState(barber.phone || "");
  const [color, setColor] = useState(barber.color || "#c87941");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/barber/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() || null, color }),
      });
      if (res.ok) {
        onSaved();
      } else {
        const d = await res.json().catch(() => ({ message: "Error al guardar" }));
        setError(d.message || "No se pudo guardar");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#e8e2dc] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconUser />
            <h3 className="font-bold text-stone-900">Mi perfil</h3>
          </div>
          <button onClick={onClose} className="grid place-items-center h-7 w-7 rounded text-stone-400 hover:bg-stone-100" aria-label="Cerrar">
            <IconX />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="field-label">Nombre</label>
            <p className="text-sm font-semibold text-stone-900">{barber.name}</p>
            <p className="text-[10px] text-stone-400 mt-0.5">Pedile al admin que lo cambie si es necesario</p>
          </div>
          <div>
            <label className="field-label">Teléfono</label>
            <input
              className="input-field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+56 9 1234 5678"
              maxLength={30}
            />
          </div>
          <div>
            <label className="field-label">Color en el calendario</label>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-16 rounded-lg border border-[#e8e2dc] cursor-pointer p-0.5 bg-white"
              />
              <span className="text-xs text-stone-500 font-mono tabular-nums">{color}</span>
              <div className="flex items-center gap-1.5 ml-auto">
                {["#c87941", "#059669", "#2563eb", "#9333ea", "#dc2626", "#6b7280"].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setColor(hex)}
                    className={`h-6 w-6 rounded-full border-2 transition ${
                      color.toLowerCase() === hex.toLowerCase()
                        ? "border-stone-800 scale-110"
                        : "border-white shadow-sm hover:scale-110"
                    }`}
                    style={{ backgroundColor: hex }}
                    aria-label={`Color ${hex}`}
                  />
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="px-5 py-3 border-t border-[#e8e2dc] bg-stone-50/40 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-[#e8e2dc] bg-white px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition shadow-sm shadow-brand/20 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
