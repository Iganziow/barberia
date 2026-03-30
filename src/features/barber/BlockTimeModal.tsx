"use client";

import { useState } from "react";

const PRESETS = ["Almuerzo", "Descanso", "Vacaciones", "Reunión", "Médico", "Otro"];

type Props = {
  defaultStart?: string; // ISO string
  defaultEnd?: string;   // ISO string
  onClose: () => void;
  onCreated: () => void;
};

function toLocalDatetimeValue(iso: string) {
  // Convert ISO to value for <input type="datetime-local">
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" + pad(d.getMonth() + 1) +
    "-" + pad(d.getDate()) +
    "T" + pad(d.getHours()) +
    ":" + pad(d.getMinutes())
  );
}

function toISOFromLocal(val: string) {
  return new Date(val).toISOString();
}

export default function BlockTimeModal({ defaultStart, defaultEnd, onClose, onCreated }: Props) {
  const now = new Date();
  const defaultStartVal = defaultStart
    ? toLocalDatetimeValue(defaultStart)
    : toLocalDatetimeValue(now.toISOString());
  const defaultEndVal = defaultEnd
    ? toLocalDatetimeValue(defaultEnd)
    : toLocalDatetimeValue(new Date(now.getTime() + 60 * 60 * 1000).toISOString());

  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [start, setStart] = useState(defaultStartVal);
  const [end, setEnd] = useState(defaultEndVal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const finalReason = reason === "Otro" ? customReason : reason;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!finalReason.trim()) {
      setError("Ingresa un motivo");
      return;
    }
    if (new Date(start) >= new Date(end)) {
      setError("La hora de fin debe ser posterior a la de inicio");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/barber/block-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: finalReason.trim(),
          start: toISOFromLocal(start),
          end: toISOFromLocal(end),
          allDay: false,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.message || "Error al guardar");
        return;
      }
      onCreated();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e2dc]">
          <div>
            <h3 className="text-base font-bold text-stone-900">Bloquear horario</h3>
            <p className="text-xs text-stone-400 mt-0.5">El tiempo bloqueado no estará disponible para reservas</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-stone-100 transition"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Reason presets */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-2">Motivo</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setReason(p)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                    reason === p
                      ? "bg-[#c87941] border-[#c87941] text-white"
                      : "bg-white border-[#e8e2dc] text-stone-600 hover:border-[#c87941]/40"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {reason === "Otro" && (
              <input
                type="text"
                placeholder="Especifica el motivo..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[#e8e2dc] px-3 py-2 text-sm focus:border-[#c87941] focus:outline-none"
                autoFocus
              />
            )}
          </div>

          {/* Date/time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Desde</label>
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-lg border border-[#e8e2dc] px-3 py-2 text-sm focus:border-[#c87941] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Hasta</label>
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-lg border border-[#e8e2dc] px-3 py-2 text-sm focus:border-[#c87941] focus:outline-none"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#e8e2dc] py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !reason}
              className="flex-1 rounded-lg bg-[#c87941] py-2.5 text-sm font-semibold text-white hover:bg-[#b56a35] disabled:opacity-50 transition"
            >
              {saving ? "Guardando..." : "Bloquear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
