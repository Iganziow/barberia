"use client";

import type { VisibleRange } from "@/types/agenda";
import { halfHourSteps, isValidRange } from "./agendaVisibleRange";

export default function AgendaVisibleRange({
  value,
  onChange,
}: {
  value: VisibleRange;
  onChange: (next: VisibleRange) => void;
}) {
  const steps = halfHourSteps();

  function update(partial: Partial<VisibleRange>) {
    const next = { ...value, ...partial };
    if (isValidRange(next)) onChange(next);
    else {
      // Auto-fix: si el usuario sube "from" por encima de "to", empujamos "to".
      if (partial.from) {
        const [h, m] = partial.from.split(":").map(Number);
        const minFrom = h * 60 + m;
        const toCandidate = Math.min(minFrom + 30, 23 * 60 + 30);
        const hh = Math.floor(toCandidate / 60);
        const mm = toCandidate % 60;
        const newTo = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
        if (isValidRange({ from: partial.from, to: newTo })) {
          onChange({ from: partial.from, to: newTo });
        }
      }
    }
  }

  const selectClass =
    "h-9 rounded-lg border border-[#e8e2dc] bg-white px-2 text-sm text-stone-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 flex-1";

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Hora desde"
        className={selectClass}
        value={value.from}
        onChange={(e) => update({ from: e.target.value })}
      >
        {steps.map((s) => (
          <option key={`from-${s}`} value={s}>
            {s}
          </option>
        ))}
      </select>
      <span className="text-xs text-stone-400">a</span>
      <select
        aria-label="Hora hasta"
        className={selectClass}
        value={value.to}
        onChange={(e) => update({ to: e.target.value })}
      >
        {steps.map((s) => (
          <option key={`to-${s}`} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
