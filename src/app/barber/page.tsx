"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import BarberShell from "@/features/barber/layout/BarberShell";
import BlockTimeModal from "@/features/barber/BlockTimeModal";
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
type BarberInfo = { id: string; name: string; color: string | null };

// Nota histórica de un cliente (viene de /api/barber/clients/[id]/notes)
type ClientNote = {
  id: string;
  date: string;
  status: string;
  serviceName: string;
  note: string;
};

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

// ─── Icons ──────────────────────────────────────────────────────────────
function IconLock() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}
function IconNote() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}
function IconWhatsApp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.31-.726-5.99-1.955l-.42-.312-3.072 1.03 1.03-3.072-.312-.42A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    </svg>
  );
}

// ─── Componente principal ───────────────────────────────────────────────
export default function BarberPage() {
  const [barber, setBarber] = useState<BarberInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [blockModal, setBlockModal] = useState<{ open: boolean; start?: string; end?: string }>({ open: false });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Estado del flujo de notas del barbero
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  // Historial de notas del cliente de la cita seleccionada
  const [clientNotes, setClientNotes] = useState<ClientNote[] | null>(null);
  const [loadingClientNotes, setLoadingClientNotes] = useState(false);

  const initials = barber
    ? barber.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  useEffect(() => {
    fetch("/api/barber/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setBarber(d.barber);
          setStats(d.stats);
        }
      })
      .catch(() => {});
  }, []);

  const refreshStats = useCallback(() => {
    fetch("/api/barber/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setStats(d.stats);
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
        id: string;
        clientId: string;
        clientName: string;
        clientPhone: string | null;
        serviceName: string;
        serviceDuration: number;
        start: string;
        end: string;
        status: string;
        price: number;
        notePublic: string | null;
        noteInternal: string | null;
        paid: boolean;
      };
      const aptEvents: CalendarEvent[] = (aptsRes.appointments || []).map((a: AptRaw) => ({
        id: a.id,
        title: `${a.clientName}\n${a.serviceName}`,
        start: a.start,
        end: a.end,
        kind: "APPOINTMENT" as const,
        status: a.status,
        clientId: a.clientId,
        clientName: a.clientName,
        clientPhone: a.clientPhone,
        serviceName: a.serviceName,
        serviceDuration: a.serviceDuration,
        price: a.price,
        notePublic: a.notePublic,
        noteInternal: a.noteInternal,
        paid: a.paid,
      }));
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
      /* ignore */
    }
  }, []);

  // Cuando se abre un evento, cargar historial de notas del cliente
  useEffect(() => {
    if (!selectedEvent || selectedEvent.kind !== "APPOINTMENT" || !selectedEvent.clientId) {
      setClientNotes(null);
      return;
    }
    // Resetear estado del campo nota
    setNoteInput(selectedEvent.noteInternal || "");
    setNoteSaved(false);
    setEditingNote(false);
    // Fetch historial
    setLoadingClientNotes(true);
    fetch(`/api/barber/clients/${selectedEvent.clientId}/notes`)
      .then((r) => (r.ok ? r.json() : { notes: [] }))
      .then((d) => {
        // Excluir la cita actual del historial (es la que están editando)
        const filtered = (d.notes || []).filter((n: ClientNote) => n.id !== selectedEvent.id);
        setClientNotes(filtered);
      })
      .catch(() => setClientNotes([]))
      .finally(() => setLoadingClientNotes(false));
  }, [selectedEvent]);

  async function updateStatus(id: string, status: "DONE" | "NO_SHOW" | "RESERVED") {
    if (status === "NO_SHOW" && !window.confirm("¿Marcar como no asistió?")) return;
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/barber/appointments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setCalEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
        if (selectedEvent?.id === id) {
          setSelectedEvent((prev) => (prev ? { ...prev, status } : null));
        }
        refreshStats();
      }
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

  return (
    <BarberShell name={barber?.name ?? ""} initials={initials}>
      {/* ── Stats bar — cards con border-left de color semántico ── */}
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

      {/* ── Calendar ── */}
      <section className="rounded-xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
        <div className="p-1 sm:p-2">
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

      {/* ── FAB: bloquear tiempo ── */}
      <button
        onClick={() => setBlockModal({ open: true })}
        className="fixed bottom-6 right-6 z-20 flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand/25 hover:bg-brand-hover transition"
      >
        <IconLock />
        Bloquear
      </button>

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
            {/* Color accent stripe */}
            <div
              className="h-1.5"
              style={{
                backgroundColor:
                  ev.kind === "BLOCK" ? "#a8a29e" : evCfg?.color ?? "#c87941",
              }}
            />

            {/* ── BLOCK ── */}
            {ev.kind === "BLOCK" ? (
              <div className="p-5">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                  Bloqueo
                </p>
                <p className="text-base font-bold text-stone-900">{ev.title}</p>
                <p className="text-xs text-stone-500 mt-1">
                  {formatDate(ev.start)} · {formatTime(ev.start)} – {formatTime(ev.end)}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => deleteBlock(ev.id)}
                    className="rounded-xl bg-red-50 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition"
                  >
                    Eliminar
                  </button>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="rounded-xl border border-[#e8e2dc] py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              /* ── APPOINTMENT ── */
              <>
                <div className="p-5 overflow-y-auto flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-stone-900 truncate">
                        {ev.clientName ?? ev.title.split("\n")[0]}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5 truncate">
                        {ev.serviceName ?? ev.title.split("\n")[1]}
                        {ev.serviceDuration ? ` · ${ev.serviceDuration} min` : ""}
                      </p>
                    </div>
                    {evCfg && (
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${evCfg.bg} ${evCfg.text}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: evCfg.color }} />
                        {evCfg.label}
                      </span>
                    )}
                  </div>

                  {/* Fecha + precio */}
                  <div className="flex items-center justify-between text-sm mb-4 pb-3 border-b border-[#f0ece8]">
                    <span className="text-stone-500">
                      {formatDate(ev.start)} · {formatTime(ev.start)} – {formatTime(ev.end)}
                    </span>
                    {ev.price !== undefined && (
                      <span className="font-bold text-stone-900 tabular-nums">
                        {formatCLP(ev.price)}
                        {ev.paid && (
                          <span className="ml-1.5 text-[10px] text-emerald-600 font-semibold">✓ pagado</span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* WhatsApp quick link */}
                  {ev.clientPhone && (
                    <a
                      href={`https://wa.me/${ev.clientPhone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                    >
                      <IconWhatsApp />
                      WhatsApp al cliente
                    </a>
                  )}

                  {/* Nota pública del cliente */}
                  {ev.notePublic && (
                    <div className="mb-4 rounded-xl bg-stone-50 border border-[#e8e2dc] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-1">
                        Mensaje del cliente
                      </p>
                      <p className="text-sm text-stone-700">{ev.notePublic}</p>
                    </div>
                  )}

                  {/* ── Historial de notas pasadas con este cliente ── */}
                  {clientNotes && clientNotes.length > 0 && (
                    <div className="mb-4 rounded-xl bg-brand/5 border border-brand/20 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-brand">
                          <IconNote />
                        </span>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
                          Historial de {ev.clientName?.split(" ")[0]} · {clientNotes.length} nota{clientNotes.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <ol className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                        {clientNotes.map((n) => (
                          <li key={n.id} className="border-l-2 border-brand/40 pl-3">
                            <p className="text-[10px] text-stone-500 mb-0.5">
                              <span className="capitalize font-semibold text-stone-600">
                                {formatShortDate(n.date)}
                              </span>
                              {" · "}
                              {n.serviceName}
                            </p>
                            <p className="text-xs text-stone-700 whitespace-pre-wrap leading-snug">
                              {n.note}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {loadingClientNotes && (
                    <p className="text-[11px] text-stone-400 mb-4 italic">
                      Buscando notas pasadas del cliente…
                    </p>
                  )}

                  {/* ── Nota interna de ESTA cita — editable ── */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 flex items-center gap-1.5">
                        <IconNote />
                        Nota de esta cita
                      </p>
                      {ev.noteInternal && !editingNote && (
                        <button
                          type="button"
                          onClick={() => setEditingNote(true)}
                          className="text-[11px] font-semibold text-amber-700 hover:text-amber-900"
                        >
                          Editar
                        </button>
                      )}
                    </div>

                    {ev.noteInternal && !editingNote ? (
                      <p className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">
                        {ev.noteInternal}
                      </p>
                    ) : (
                      <>
                        <textarea
                          className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 resize-y min-h-[70px]"
                          value={noteInput}
                          onChange={(e) => {
                            setNoteInput(e.target.value);
                            setNoteSaved(false);
                          }}
                          placeholder="Ej: Pidió tapper fade, degradado bajo. No le gustan los tijeretazos en la nuca."
                          maxLength={2000}
                        />
                        <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                          <p className="text-[10px] text-stone-500 leading-snug">
                            Para recordar qué te pidió la próxima vez
                          </p>
                          <div className="flex items-center gap-2">
                            {noteSaved && (
                              <span className="text-[11px] text-emerald-700 font-semibold">
                                ✓ Guardada
                              </span>
                            )}
                            {ev.noteInternal && editingNote && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNoteInput(ev.noteInternal || "");
                                  setEditingNote(false);
                                }}
                                className="text-xs font-medium text-stone-500 hover:text-stone-800"
                              >
                                Cancelar
                              </button>
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

                {/* ── Footer: actions ── */}
                <div className="border-t border-[#f0ece8] bg-stone-50/40 p-4 grid grid-cols-2 gap-2 shrink-0">
                  {ev.status === "RESERVED" && (
                    <>
                      <button
                        onClick={() => updateStatus(ev.id, "DONE")}
                        disabled={isUpdating}
                        className="rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                      >
                        Completar cita
                      </button>
                      <button
                        onClick={() => updateStatus(ev.id, "NO_SHOW")}
                        disabled={isUpdating}
                        className="rounded-xl bg-red-50 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                      >
                        No asistió
                      </button>
                    </>
                  )}
                  {(ev.status === "DONE" || ev.status === "NO_SHOW") && (
                    <button
                      onClick={() => updateStatus(ev.id, "RESERVED")}
                      disabled={isUpdating}
                      className="rounded-xl bg-stone-100 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-200 transition disabled:opacity-50"
                    >
                      Deshacer
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="rounded-xl border border-[#e8e2dc] bg-white py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition col-span-2 sm:col-auto"
                  >
                    Cerrar
                  </button>
                </div>
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
    </BarberShell>
  );
}
