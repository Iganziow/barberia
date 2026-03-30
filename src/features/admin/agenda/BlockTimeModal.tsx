"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/ui/modal";
import type { AgendaEvent, BarberOption } from "@/types/agenda";
import { hasOverlap } from "./agendaOverlap";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseDateTime(dateStr: string, hh: number, mm: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(hh, mm, 0, 0);
  return d;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function addWeeks(d: Date, weeks: number) {
  return addDays(d, weeks * 7);
}

type RepeatFrequency = "DAILY" | "WEEKLY";
type RepeatEndMode = "COUNT" | "UNTIL";

export default function BlockTimeModal({
  open,
  onClose,
  startISO,
  defaultBarberId,
  barbers,
  existingEvents,
  onCreateMany,
}: {
  open: boolean;
  onClose: () => void;
  startISO: string | null;
  defaultBarberId: string;
  barbers: BarberOption[];
  existingEvents: AgendaEvent[];
  onCreateMany: (blocks: Array<{
    reason: string;
    startISO: string;
    endISO: string;
    barberId: string;
  }>) => void;
}) {
  // Compute initial values from props
  const initStart = startISO ? new Date(startISO) : (() => { const n = new Date(); n.setMinutes(0, 0, 0); return n; })();
  const initEnd = new Date(initStart);
  initEnd.setHours(initStart.getHours() + 1);

  const [reason, setReason] = useState("Bloqueado");
  const [barberId, setBarberId] = useState(defaultBarberId);
  const [startDate, setStartDate] = useState(toDateInputValue(initStart));
  const [startH, setStartH] = useState(initStart.getHours());
  const [startM, setStartM] = useState(startISO ? initStart.getMinutes() : 0);
  const [endDate, setEndDate] = useState(toDateInputValue(initEnd));
  const [endH, setEndH] = useState(initEnd.getHours());
  const [endM, setEndM] = useState(startISO ? initEnd.getMinutes() : 0);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [freq, setFreq] = useState<RepeatFrequency>("DAILY");
  const [everyN, setEveryN] = useState(1);
  const [endMode, setEndMode] = useState<RepeatEndMode>("COUNT");
  const [endCount, setEndCount] = useState(5);
  const [untilDate, setUntilDate] = useState(toDateInputValue(addDays(initStart, 14)));

  const startDT = useMemo(() => {
    if (!startDate) return null;
    return parseDateTime(startDate, startH, startM);
  }, [startDate, startH, startM]);

  const endDT = useMemo(() => {
    if (!endDate) return null;
    return parseDateTime(endDate, endH, endM);
  }, [endDate, endH, endM]);

  const isValid = useMemo(() => {
    if (!startDT || !endDT) return false;
    if (!reason.trim()) return false;
    return endDT.getTime() > startDT.getTime();
  }, [startDT, endDT, reason]);

  const occurrences = useMemo(() => {
    if (!startDT || !endDT) return [];
    const result: Array<{ start: Date; end: Date }> = [];
    const durationMs = endDT.getTime() - startDT.getTime();

    result.push({ start: startDT, end: new Date(startDT.getTime() + durationMs) });
    if (!repeatEnabled) return result;

    let nextStart = new Date(startDT);
    const step = () => {
      if (freq === "DAILY") nextStart = addDays(nextStart, everyN);
      else nextStart = addWeeks(nextStart, everyN);
    };

    if (endMode === "COUNT") {
      const total = Math.max(1, endCount);
      while (result.length < total) {
        step();
        result.push({ start: new Date(nextStart), end: new Date(nextStart.getTime() + durationMs) });
      }
      return result;
    }

    const until = untilDate ? new Date(untilDate + "T23:59:59") : null;
    if (!until) return result;

    while (result.length < 200) {
      step();
      if (nextStart.getTime() > until.getTime()) break;
      result.push({ start: new Date(nextStart), end: new Date(nextStart.getTime() + durationMs) });
    }
    return result;
  }, [startDT, endDT, repeatEnabled, freq, everyN, endMode, endCount, untilDate]);

  const overlap = useMemo(() => {
    if (!isValid || occurrences.length === 0) return { ok: true, conflicts: [] as AgendaEvent[] };

    const all: AgendaEvent[] = [];
    for (const occ of occurrences) {
      const res = hasOverlap(existingEvents, {
        startISO: occ.start.toISOString(),
        endISO: occ.end.toISOString(),
        barberId,
      });
      if (!res.ok) all.push(...res.conflicts);
    }

    const uniq = Array.from(new Map(all.map((e) => [e.id, e])).values());
    return { ok: uniq.length === 0, conflicts: uniq };
  }, [existingEvents, isValid, barberId, occurrences]);

  function handleCreate() {
    if (!isValid || !startDT || !endDT) return;
    if (!overlap.ok) return;

    const blocks = occurrences.map((occ) => ({
      reason: reason.trim(),
      startISO: occ.start.toISOString(),
      endISO: occ.end.toISOString(),
      barberId,
    }));

    onCreateMany(blocks);
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Bloqueo de horas"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose} type="button">Cancelar</button>
          <button className="btn-primary" onClick={handleCreate} disabled={!isValid || !overlap.ok} type="button">Bloquear</button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Motivo + Profesional side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Motivo</label>
            <input className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Colación / Reunión" />
          </div>
          <div>
            <label className="field-label">Profesional</label>
            <select className="input-field" value={barberId} onChange={(e) => setBarberId(e.target.value)}>
              {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        {/* Inicio */}
        <div>
          <label className="field-label">Inicio</label>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" className="input-field w-auto" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <select className="input-field w-[70px]" value={startH} onChange={(e) => setStartH(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{pad2(i)}</option>)}
            </select>
            <span className="text-stone-400 font-bold">:</span>
            <select className="input-field w-[70px]" value={startM} onChange={(e) => setStartM(Number(e.target.value))}>
              {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{pad2(m)}</option>)}
            </select>
          </div>
        </div>

        {/* Fin */}
        <div>
          <label className="field-label">Fin</label>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" className="input-field w-auto" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <select className="input-field w-[70px]" value={endH} onChange={(e) => setEndH(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{pad2(i)}</option>)}
            </select>
            <span className="text-stone-400 font-bold">:</span>
            <select className="input-field w-[70px]" value={endM} onChange={(e) => setEndM(Number(e.target.value))}>
              {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{pad2(m)}</option>)}
            </select>
          </div>
        </div>

        {!isValid && <p className="text-sm text-red-600">Revisa que el fin sea mayor al inicio y que el motivo no esté vacío.</p>}

        {!overlap.ok && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium">Se solapa con {overlap.conflicts.length} evento(s) existentes.</p>
          </div>
        )}

        {/* Repetir */}
        <details className="group">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-700 list-none">
            <input type="checkbox" checked={repeatEnabled} onChange={(e) => setRepeatEnabled(e.target.checked)} className="rounded" />
            Repetir bloqueo
          </summary>
          {repeatEnabled && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <label className="field-label">Frecuencia</label>
                <select className="input-field" value={freq} onChange={(e) => setFreq(e.target.value as RepeatFrequency)}>
                  <option value="DAILY">Diario</option>
                  <option value="WEEKLY">Semanal</option>
                </select>
              </div>
              <div>
                <label className="field-label">Cada</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} className="input-field w-16" value={everyN} onChange={(e) => setEveryN(Number(e.target.value))} />
                  <span className="text-xs text-stone-400">{freq === "DAILY" ? "día(s)" : "sem."}</span>
                </div>
              </div>
              <div>
                <label className="field-label">Termina</label>
                <select className="input-field" value={endMode} onChange={(e) => setEndMode(e.target.value as RepeatEndMode)}>
                  <option value="COUNT">Después de</option>
                  <option value="UNTIL">El día</option>
                </select>
              </div>
              <div className="col-span-3">
                {endMode === "COUNT" ? (
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} className="input-field w-20" value={endCount} onChange={(e) => setEndCount(Number(e.target.value))} />
                    <span className="text-xs text-stone-400">repeticiones (incluye original)</span>
                  </div>
                ) : (
                  <input type="date" className="input-field" value={untilDate} onChange={(e) => setUntilDate(e.target.value)} />
                )}
              </div>
            </div>
          )}
        </details>
      </div>
    </Modal>
  );
}
