"use client";

import { useEffect, useMemo, useState } from "react";

export default function SlotActionMenu({
  open,
  x,
  y,
  timeLabel,
  isPast = false,
  onClose,
  onReserve,
  onBlock,
}: {
  open: boolean;
  x: number;
  y: number;
  /** Hora del slot clickeado, ej: "10:30" */
  timeLabel?: string;
  /** Si el slot ya pasó — deshabilita "Reservar" */
  isPast?: boolean;
  onClose: () => void;
  onReserve: () => void;
  onBlock: () => void;
}) {
  const MENU_W = 224;
  const MENU_H = 120;

  const [vp, setVp] = useState({ w: 1024, h: 768 });

  useEffect(() => {
    function onResize() {
      setVp({ w: window.innerWidth, h: window.innerHeight });
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const pos = useMemo(() => {
    const pad = 12;
    const clampedX = Math.min(Math.max(x, pad), vp.w - MENU_W - pad);
    const clampedY = Math.min(Math.max(y, pad), vp.h - MENU_H - pad);
    return { x: clampedX, y: clampedY };
  }, [x, y, vp.w, vp.h]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose} aria-hidden="true">
      <div
        className="absolute w-56 rounded-xl border border-[#e8e2dc] bg-white shadow-xl text-stone-900"
        style={{ left: pos.x, top: pos.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e8e2dc]">
          <span className="text-sm font-semibold text-stone-800">
            {timeLabel ? `Agregar a las ${timeLabel}` : "Agregar"}
          </span>
          <button
            className="grid h-6 w-6 place-items-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition"
            onClick={onClose}
            type="button"
            aria-label="Cerrar"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3L3 9M3 3l6 6" /></svg>
          </button>
        </div>

        <div className="py-1">
          <button
            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm transition ${
              isPast
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-brand/5"
            }`}
            onClick={() => { if (isPast) return; onReserve(); onClose(); }}
            disabled={isPast}
            type="button"
            title={isPast ? "No se puede reservar en horarios pasados" : undefined}
          >
            <svg className="h-4 w-4 text-brand" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span>Reserva</span>
            {isPast && <span className="ml-auto text-[10px] text-stone-400">hora pasada</span>}
          </button>

          <button
            className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-3 text-sm transition"
            onClick={() => { onBlock(); onClose(); }}
            type="button"
          >
            <svg className="h-4 w-4 text-stone-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><path d="M4.93 4.93l14.14 14.14" />
            </svg>
            <span>Bloquear horario</span>
          </button>
        </div>
      </div>
    </div>
  );
}
