"use client";

import type { BarberOption } from "@/types/agenda";

/**
 * Multi-select de barberos con chips. Un chip "Todos" que limpia la selección;
 * si hay selecciones, se muestra cada barbero como chip toggleable.
 */
export default function AgendaBarberSelect({
  barbers,
  selected,
  onChange,
}: {
  barbers: BarberOption[];
  selected: string[]; // [] = todos
  onChange: (next: string[]) => void;
}) {
  const isAll = selected.length === 0;

  function toggle(id: string) {
    if (selected.includes(id)) {
      const next = selected.filter((x) => x !== id);
      onChange(next);
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange([])}
        className={`rounded-full px-3 py-1 text-xs font-medium transition border ${
          isAll
            ? "bg-brand text-white border-brand shadow-sm"
            : "bg-white text-stone-600 border-[#e8e2dc] hover:border-brand/40"
        }`}
      >
        Todos
      </button>
      {barbers.map((b) => {
        const active = selected.includes(b.id);
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => toggle(b.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition border flex items-center gap-1.5 ${
              active
                ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                : "bg-white text-stone-700 border-[#e8e2dc] hover:border-brand/40"
            }`}
            title={b.name}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: b.color || "#c87941" }}
            />
            {b.name}
          </button>
        );
      })}
    </div>
  );
}
