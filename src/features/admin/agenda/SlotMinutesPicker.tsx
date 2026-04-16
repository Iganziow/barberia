"use client";

import { useEffect, useRef, useState } from "react";
import {
  SLOT_MINUTES_OPTIONS,
  type SlotMinutes,
} from "./agendaGridMath";

/**
 * Botón + dropdown para elegir la granularidad del calendario (5, 10, 15, 20, 30, 45, 60 min).
 * Inspirado en el selector de Agenda Pro.
 */
export default function SlotMinutesPicker({
  value,
  onChange,
}: {
  value: SlotMinutes;
  onChange: (value: SlotMinutes) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-md border border-[#e8e2dc] bg-white text-brand hover:border-brand/40 hover:bg-brand/5 transition"
        aria-label="Cambiar intervalo de tiempo"
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Intervalo de tiempo"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1 z-30 w-36 rounded-lg border border-[#e8e2dc] bg-white shadow-xl overflow-hidden"
        >
          {SLOT_MINUTES_OPTIONS.map((opt) => {
            const selected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-[13px] transition ${
                  selected
                    ? "bg-brand/10 text-brand font-semibold"
                    : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                {opt} minutos
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
