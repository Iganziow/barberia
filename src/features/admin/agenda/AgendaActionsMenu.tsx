"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Menú "Más opciones" del agenda: imprimir, exportar CSV, exportar iCal.
 */
export default function AgendaActionsMenu({
  onPrint,
  exportUrl,
}: {
  onPrint: () => void;
  /** Función que construye el URL con los filtros actuales (branch/barber/date). */
  exportUrl: (format: "csv" | "ics") => string;
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
        className="grid h-9 w-9 place-items-center rounded-md border border-[#e8e2dc] bg-white text-stone-500 hover:border-brand/40 hover:bg-brand/5 hover:text-brand transition"
        aria-label="Más opciones"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Más opciones"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <circle cx="10" cy="4" r="1.75" />
          <circle cx="10" cy="10" r="1.75" />
          <circle cx="10" cy="16" r="1.75" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 mt-1 z-30 w-52 rounded-lg border border-[#e8e2dc] bg-white shadow-xl overflow-hidden max-[640px]:left-0 max-[640px]:right-auto"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onPrint();
            }}
            className="w-full text-left px-3 py-2 text-[13px] text-stone-700 hover:bg-stone-50 transition flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-stone-500">
              <path d="M6 2v4h8V2H6zm9 6H5a2 2 0 00-2 2v5h2v3h10v-3h2v-5a2 2 0 00-2-2zm-2 8H7v-4h6v4z" />
            </svg>
            Imprimir
          </button>
          <a
            href={exportUrl("csv")}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="w-full text-left px-3 py-2 text-[13px] text-stone-700 hover:bg-stone-50 transition flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-stone-500">
              <path d="M4 3h7l5 5v9a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm7 1v4h4" />
            </svg>
            Exportar CSV
          </a>
          <a
            href={exportUrl("ics")}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="w-full text-left px-3 py-2 text-[13px] text-stone-700 hover:bg-stone-50 transition flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-stone-500">
              <rect x="3" y="4" width="14" height="14" rx="2" fillOpacity="0.2" />
              <rect x="3" y="4" width="14" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 2v4M14 2v4M3 8h14" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
            Exportar iCal
          </a>
        </div>
      )}
    </div>
  );
}
