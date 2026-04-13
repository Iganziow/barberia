"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import BarberShell from "@/features/barber/layout/BarberShell";
import BlockTimeModal from "@/features/barber/BlockTimeModal";
import type { CalendarEvent } from "@/features/barber/BarberCalendar";

const BarberCalendar = dynamic(() => import("@/features/barber/BarberCalendar"), { ssr: false });

import { formatCLP, formatTime } from "@/lib/format";
import { STATUS_CONFIG } from "@/lib/constants";

type Stats = { totalToday: number; doneToday: number; pendingToday: number; revenueToday: number };
type BarberInfo = { id: string; name: string; color: string | null };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
}

export default function BarberPage() {
  const [barber, setBarber] = useState<BarberInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [blockModal, setBlockModal] = useState<{ open: boolean; start?: string; end?: string }>({ open: false });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const initials = barber ? barber.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "?";

  useEffect(() => {
    fetch("/api/barber/me").then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setBarber(d.barber); setStats(d.stats); } }).catch(() => {});
  }, []);

  const refreshStats = useCallback(() => {
    fetch("/api/barber/me").then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d.stats); }).catch(() => {});
  }, []);

  const loadCalendarEvents = useCallback(async (from: string, to: string) => {
    try {
      const [aptsRes, blocksRes] = await Promise.all([
        fetch(`/api/barber/appointments?from=${from}&to=${to}`).then(r => r.ok ? r.json() : { appointments: [] }).catch(() => ({ appointments: [] })),
        fetch(`/api/barber/block-times?from=${from}&to=${to}`).then(r => r.ok ? r.json() : { blockTimes: [] }).catch(() => ({ blockTimes: [] })),
      ]);
      type AptRaw = { id: string; clientName: string; clientPhone: string | null; serviceName: string; serviceDuration: number; start: string; end: string; status: string; price: number; notePublic: string | null };
      const aptEvents: CalendarEvent[] = (aptsRes.appointments || []).map((a: AptRaw) => ({
        id: a.id, title: `${a.clientName}\n${a.serviceName}`, start: a.start, end: a.end, kind: "APPOINTMENT" as const, status: a.status,
        clientName: a.clientName, clientPhone: a.clientPhone, serviceName: a.serviceName, serviceDuration: a.serviceDuration, price: a.price, notePublic: a.notePublic,
      }));
      const blockEvents: CalendarEvent[] = (blocksRes.blockTimes || []).map((b: { id: string; reason: string; start: string; end: string }) => ({
        id: b.id, title: b.reason, start: b.start, end: b.end, kind: "BLOCK" as const,
      }));
      setCalEvents([...aptEvents, ...blockEvents]);
    } catch { /* ignore */ }
  }, []);

  async function updateStatus(id: string, status: "DONE" | "NO_SHOW" | "RESERVED") {
    if (status === "NO_SHOW" && !window.confirm("Marcar como no asistio?")) return;
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/barber/appointments/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (res.ok) {
        setCalEvents(prev => prev.map(e => e.id === id ? { ...e, status } : e));
        if (selectedEvent?.id === id) setSelectedEvent(prev => prev ? { ...prev, status } : null);
        refreshStats();
      }
    } finally { setUpdatingId(null); }
  }

  async function deleteBlock(id: string) {
    const res = await fetch(`/api/barber/block-times/${id}`, { method: "DELETE" });
    if (res.ok) { setCalEvents(prev => prev.filter(e => e.id !== id)); setSelectedEvent(null); }
  }

  const isUpdating = updatingId !== null;
  const ev = selectedEvent;
  const evCfg = ev?.status ? STATUS_CONFIG[ev.status] : null;

  return (
    <BarberShell name={barber?.name ?? ""} initials={initials}>
      {/* Stats bar — compact inline */}
      {stats && (
        <div className="flex gap-2 sm:gap-3 mb-3 overflow-x-auto pb-1">
          {[
            { label: "Citas", value: stats.totalToday, color: "text-stone-800", icon: "#3B82F6", bg: "bg-blue-50" },
            { label: "Pendientes", value: stats.pendingToday, color: "text-stone-800", icon: "#F59E0B", bg: "bg-amber-50" },
            { label: "Listas", value: stats.doneToday, color: "text-emerald-600", icon: "#10B981", bg: "bg-emerald-50" },
            { label: "Cobrado", value: formatCLP(stats.revenueToday), color: "text-brand", icon: "#c87941", bg: "bg-brand/10" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 rounded-lg bg-white border border-[#e8e2dc] px-3 py-2 shrink-0">
              <div className={`h-6 w-6 rounded-md ${s.bg} flex items-center justify-center`}>
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.icon }} />
              </div>
              <div>
                <div className={`text-sm font-black leading-none ${s.color}`}>{s.value}</div>
                <div className="text-[9px] text-stone-400 font-medium">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar — full width, no side panel */}
      <section className="rounded-xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
        <div className="p-1 sm:p-2">
          <BarberCalendar
            events={calEvents}
            onSelectSlot={({ isoStart, isoEnd }) => { setSelectedEvent(null); setBlockModal({ open: true, start: isoStart, end: isoEnd }); }}
            onClickEvent={(event) => setSelectedEvent(event)}
            onRangeChange={loadCalendarEvents}
          />
        </div>
      </section>

      {/* FAB — Block time */}
      <button
        onClick={() => setBlockModal({ open: true })}
        className="fixed bottom-6 right-6 z-20 flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand/25 hover:bg-brand-hover transition"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
        Bloquear
      </button>

      {/* Event detail modal */}
      {ev && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} role="presentation">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="h-1.5" style={{ backgroundColor: ev.kind === "BLOCK" ? "#a8a29e" : (evCfg?.color ?? "#c87941") }} />

            {ev.kind === "BLOCK" ? (
              <div className="p-5">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Bloqueo</p>
                <p className="text-base font-bold text-stone-900">{ev.title}</p>
                <p className="text-xs text-stone-400 mt-1">{formatDate(ev.start)} &middot; {formatTime(ev.start)} - {formatTime(ev.end)}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={() => deleteBlock(ev.id)} className="rounded-xl bg-red-50 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition">Eliminar</button>
                  <button onClick={() => setSelectedEvent(null)} className="rounded-xl border border-[#e8e2dc] py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition">Cerrar</button>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-base font-bold text-stone-900">{ev.clientName ?? ev.title.split("\n")[0]}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{ev.serviceName ?? ev.title.split("\n")[1]}{ev.serviceDuration ? ` \u00b7 ${ev.serviceDuration} min` : ""}</p>
                  </div>
                  {evCfg && (
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${evCfg.bg} ${evCfg.text}`}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: evCfg.color }} />{evCfg.label}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-stone-500">{formatDate(ev.start)} &middot; {formatTime(ev.start)} - {formatTime(ev.end)}</span>
                  {ev.price !== undefined && <span className="font-bold text-stone-800">{formatCLP(ev.price)}</span>}
                </div>

                {ev.clientPhone && (
                  <a href={`https://wa.me/${ev.clientPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mb-3 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100 transition">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.31-.726-5.99-1.955l-.42-.312-3.072 1.03 1.03-3.072-.312-.42A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /></svg>
                    WhatsApp
                  </a>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {ev.status === "RESERVED" && (<>
                    <button onClick={() => updateStatus(ev.id, "DONE")} disabled={isUpdating} className="rounded-xl bg-emerald-50 py-2.5 text-sm font-bold text-emerald-600 hover:bg-emerald-100 transition disabled:opacity-50">Completar</button>
                    <button onClick={() => updateStatus(ev.id, "NO_SHOW")} disabled={isUpdating} className="rounded-xl bg-red-50 py-2.5 text-sm font-bold text-red-500 hover:bg-red-100 transition disabled:opacity-50">No asistio</button>
                  </>)}
                  {(ev.status === "DONE" || ev.status === "NO_SHOW") && (
                    <button onClick={() => updateStatus(ev.id, "RESERVED")} disabled={isUpdating} className="rounded-xl bg-stone-50 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-100 transition disabled:opacity-50">Deshacer</button>
                  )}
                  <button onClick={() => setSelectedEvent(null)} className="rounded-xl border border-[#e8e2dc] py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition">Cerrar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Block time modal */}
      {blockModal.open && (
        <BlockTimeModal
          defaultStart={blockModal.start} defaultEnd={blockModal.end}
          onClose={() => setBlockModal({ open: false })}
          onCreated={() => { setBlockModal({ open: false }); setCalEvents([]); }}
        />
      )}
    </BarberShell>
  );
}
