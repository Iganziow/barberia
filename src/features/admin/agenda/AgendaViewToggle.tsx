"use client";

export type AgendaViewMode = "day" | "week" | "month";

const LABELS: Record<AgendaViewMode, string> = {
  day: "Día",
  week: "Semana",
  month: "Mes",
};

export default function AgendaViewToggle({
  mode,
  onChange,
}: {
  mode: AgendaViewMode;
  onChange: (mode: AgendaViewMode) => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-lg border border-[#e8e2dc] bg-white p-0.5 text-xs font-semibold"
      role="tablist"
      aria-label="Vista del calendario"
    >
      {(["day", "week", "month"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          onClick={() => onChange(m)}
          className={`rounded-md px-3 py-1.5 transition ${
            mode === m
              ? "bg-stone-900 text-white shadow-sm"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          {LABELS[m]}
        </button>
      ))}
    </div>
  );
}
