"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/modal";
import type { AgendaEvent } from "./AgendaCalendar";
import { hasOverlap } from "./agendaOverlap";

type BarberOption = { id: string; name: string };

// ✅ por ahora mock, luego lo conectamos a DB
const MOCK_BARBERS: BarberOption[] = [
  { id: "barber-1", name: "daniel Silva" },
  { id: "barber-2", name: "Juan Pérez" },
];

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
  existingEvents,
  onCreateMany,
}: {
  open: boolean;
  onClose: () => void;
  startISO: string | null;
  defaultBarberId: string;
  existingEvents: AgendaEvent[]; // ✅ nuevo
  onCreateMany: (blocks: Array<{
    reason: string;
    startISO: string;
    endISO: string;
    barberId: string;
  }>) => void;
}) {
  // motivo
  const [reason, setReason] = useState("");

  // profesional seleccionado
  const [barberId, setBarberId] = useState(defaultBarberId);

  // inicio/fin (fecha + hora)
  const [startDate, setStartDate] = useState<string>("");
  const [startH, setStartH] = useState<number>(9);
  const [startM, setStartM] = useState<number>(0);

  const [endDate, setEndDate] = useState<string>("");
  const [endH, setEndH] = useState<number>(10);
  const [endM, setEndM] = useState<number>(0);

  // repetir
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [freq, setFreq] = useState<RepeatFrequency>("DAILY");
  const [everyN, setEveryN] = useState<number>(1);
  const [endMode, setEndMode] = useState<RepeatEndMode>("COUNT");
  const [endCount, setEndCount] = useState<number>(5);
  const [untilDate, setUntilDate] = useState<string>("");

  // al abrir modal, precargar desde startISO
  useEffect(() => {
    if (!open) return;
    setReason("Bloqueado");
    setBarberId(defaultBarberId);

    if (startISO) {
      const s = new Date(startISO);
      const e = new Date(s);
      e.setHours(s.getHours() + 1);

      setStartDate(toDateInputValue(s));
      setStartH(s.getHours());
      setStartM(s.getMinutes());

      setEndDate(toDateInputValue(e));
      setEndH(e.getHours());
      setEndM(e.getMinutes());

      setUntilDate(toDateInputValue(addDays(s, 14)));
    } else {
      const now = new Date();
      const s = new Date(now);
      s.setMinutes(0, 0, 0);
      const e = new Date(s);
      e.setHours(s.getHours() + 1);

      setStartDate(toDateInputValue(s));
      setStartH(s.getHours());
      setStartM(0);

      setEndDate(toDateInputValue(e));
      setEndH(e.getHours());
      setEndM(0);

      setUntilDate(toDateInputValue(addDays(s, 14)));
    }

    setRepeatEnabled(false);
    setFreq("DAILY");
    setEveryN(1);
    setEndMode("COUNT");
    setEndCount(5);
  }, [open, startISO, defaultBarberId]);

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

  function buildOccurrences(): Array<{ start: Date; end: Date }> {
    if (!startDT || !endDT) return [];
    const occurrences: Array<{ start: Date; end: Date }> = [];

    const durationMs = endDT.getTime() - startDT.getTime();

    // primera ocurrencia
    occurrences.push({
      start: startDT,
      end: new Date(startDT.getTime() + durationMs),
    });

    if (!repeatEnabled) return occurrences;

    let nextStart = new Date(startDT);
    const step = () => {
      if (freq === "DAILY") nextStart = addDays(nextStart, everyN);
      else nextStart = addWeeks(nextStart, everyN);
    };

    if (endMode === "COUNT") {
      const total = Math.max(1, endCount);
      while (occurrences.length < total) {
        step();
        occurrences.push({
          start: new Date(nextStart),
          end: new Date(nextStart.getTime() + durationMs),
        });
      }
      return occurrences;
    }

    // UNTIL
    const until = untilDate ? new Date(untilDate + "T23:59:59") : null;
    if (!until) return occurrences;

    while (true) {
      step();
      if (nextStart.getTime() > until.getTime()) break;

      occurrences.push({
        start: new Date(nextStart),
        end: new Date(nextStart.getTime() + durationMs),
      });

      if (occurrences.length > 200) break;
    }
    return occurrences;
  }

  // ✅ VALIDACIÓN SOLAPAMIENTO (incluye repeticiones)
  const overlap = useMemo(() => {
    if (!isValid) return { ok: true, conflicts: [] as AgendaEvent[] };

    const occs = buildOccurrences();
    const all: AgendaEvent[] = [];

    for (const occ of occs) {
      const res = hasOverlap(existingEvents, {
        startISO: occ.start.toISOString(),
        endISO: occ.end.toISOString(),
        barberId,
      });

      if (!res.ok) all.push(...res.conflicts);
    }

    // dedupe por id para no inflar
    const uniq = Array.from(new Map(all.map((e) => [e.id, e])).values());

    return { ok: uniq.length === 0, conflicts: uniq };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    existingEvents,
    isValid,
    barberId,
    reason,
    startDate,
    startH,
    startM,
    endDate,
    endH,
    endM,
    repeatEnabled,
    freq,
    everyN,
    endMode,
    endCount,
    untilDate,
  ]);

  function handleCreate() {
    if (!isValid || !startDT || !endDT) return;
    if (!overlap.ok) return;

    const blocks = buildOccurrences().map((occ) => ({
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
          <button
            className="px-4 py-2 rounded border text-black bg-white hover:bg-gray-50"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
            onClick={handleCreate}
            disabled={!isValid || !overlap.ok}
            type="button"
          >
            Bloquear
          </button>
        </div>
      }
    >
      <div className="space-y-5 text-black">
        {/* Motivo */}
        <div>
          <label className="block text-sm font-medium mb-1 text-black">
            Motivo/Etiqueta
          </label>
          <input
            className="w-full border rounded-md px-3 py-2 text-black placeholder-gray-400 bg-white"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Colación / Reunión / Personal"
          />
        </div>

        {/* Profesional */}
        <div>
          <label className="block text-sm font-medium mb-1 text-black">
            Profesional
          </label>
          <select
            className="w-full border rounded-md px-3 py-2 text-black bg-white"
            value={barberId}
            onChange={(e) => setBarberId(e.target.value)}
          >
            {MOCK_BARBERS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Inicio/Fin */}
        <div className="rounded-lg border p-4 space-y-4 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-black">
                Fecha de inicio
              </label>
              <input
                type="date"
                className="w-full border rounded-md px-3 py-2 text-black bg-white"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-black">
                Hora
              </label>
              <select
                className="w-full border rounded-md px-3 py-2 text-black bg-white"
                value={startH}
                onChange={(e) => setStartH(Number(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {pad2(i)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-black">
                Min
              </label>
              <select
                className="w-full border rounded-md px-3 py-2 text-black bg-white"
                value={startM}
                onChange={(e) => setStartM(Number(e.target.value))}
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>
                    {pad2(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-black">
                Fecha de fin
              </label>
              <input
                type="date"
                className="w-full border rounded-md px-3 py-2 text-black bg-white"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-black">
                Hora
              </label>
              <select
                className="w-full border rounded-md px-3 py-2 text-black bg-white"
                value={endH}
                onChange={(e) => setEndH(Number(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {pad2(i)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-black">
                Min
              </label>
              <select
                className="w-full border rounded-md px-3 py-2 text-black bg-white"
                value={endM}
                onChange={(e) => setEndM(Number(e.target.value))}
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>
                    {pad2(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isValid && (
            <p className="text-sm text-red-600">
              Revisa que el fin sea mayor al inicio y que el motivo no esté vacío.
            </p>
          )}

          {!overlap.ok && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-medium">No se puede bloquear</p>
              <p className="mt-1">
                El bloqueo se solapa con {overlap.conflicts.length} evento(s) existentes.
              </p>
            </div>
          )}
        </div>

        {/* Repetir */}
        <div className="space-y-3">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-black">
            <input
              type="checkbox"
              checked={repeatEnabled}
              onChange={(e) => setRepeatEnabled(e.target.checked)}
            />
            Repetir bloqueo
          </label>

          {repeatEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-black">
                  Repetir
                </label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-black bg-white"
                  value={freq}
                  onChange={(e) => setFreq(e.target.value as RepeatFrequency)}
                >
                  <option value="DAILY">Diariamente</option>
                  <option value="WEEKLY">Semanalmente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-black">
                  Cada
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    className="w-24 border rounded-md px-3 py-2 text-black bg-white"
                    value={everyN}
                    onChange={(e) => setEveryN(Number(e.target.value))}
                  />
                  <span className="text-sm text-gray-700">
                    {freq === "DAILY" ? "día(s)" : "semana(s)"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-black">
                  Finaliza
                </label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-black bg-white"
                  value={endMode}
                  onChange={(e) => setEndMode(e.target.value as RepeatEndMode)}
                >
                  <option value="COUNT">Después de</option>
                  <option value="UNTIL">El día</option>
                </select>
              </div>

              {endMode === "COUNT" ? (
                <div className="md:col-span-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      className="w-28 border rounded-md px-3 py-2 text-black bg-white"
                      value={endCount}
                      onChange={(e) => setEndCount(Number(e.target.value))}
                    />
                    <span className="text-sm text-gray-700">repeticiones</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Incluye el bloqueo original.</p>
                </div>
              ) : (
                <div className="md:col-span-3">
                  <input
                    type="date"
                    className="w-full border rounded-md px-3 py-2 text-black bg-white"
                    value={untilDate}
                    onChange={(e) => setUntilDate(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Incluye el bloqueo original.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
