"use client";

import type { VisibleRange } from "@/types/agenda";
import { fromSteps, toSteps, isValidRange } from "./agendaVisibleRange";

export default function AgendaVisibleRange({
  value,
  onChange,
}: {
  value: VisibleRange;
  onChange: (next: VisibleRange) => void;
}) {
  const fSteps = fromSteps();
  const tSteps = toSteps();

  function update(partial: Partial<VisibleRange>) {
    const next = { ...value, ...partial };
    if (isValidRange(next)) {
      onChange(next);
    } else if (partial.from) {
      // Auto-fix: empujar "to" si from > to
      const [h, m] = partial.from.split(":").map(Number);
      const minFrom = h * 60 + m;
      const toCandidate = Math.min(minFrom + 60, 23 * 60);
      const hh = Math.floor(toCandidate / 60);
      const mm = toCandidate % 60;
      const newTo = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      if (isValidRange({ from: partial.from, to: newTo })) {
        onChange({ from: partial.from, to: newTo });
      }
    }
  }

  const selectClass =
    "h-8 rounded-md border border-[#e8e2dc] bg-white px-2 text-[13px] text-stone-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 flex-1 tabular-nums";

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Hora desde"
        className={selectClass}
        value={value.from}
        onChange={(e) => update({ from: e.target.value })}
      >
        {fSteps.map((s) => (
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
        {tSteps.map((s) => (
          <option key={`to-${s}`} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
