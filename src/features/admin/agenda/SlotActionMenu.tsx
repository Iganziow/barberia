"use client";

import { useEffect, useMemo, useState } from "react";

export default function SlotActionMenu({
  open,
  x,
  y,
  onClose,
  onReserve,
  onBlock,
}: {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onReserve: () => void;
  onBlock: () => void;
}) {
  const MENU_W = 224; // w-56
  const MENU_H = 120; // aprox (header + 2 items)

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
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <div
        className="absolute w-56 rounded-lg bg-white shadow-lg border text-black"
        style={{ left: pos.x, top: pos.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-lg leading-none">＋</span>
            <span>Agregar</span>
          </div>
          <button
            className="text-gray-500 hover:text-black"
            onClick={onClose}
            type="button"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <button
          className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
          onClick={() => {
            onReserve();
            onClose();
          }}
          type="button"
        >
          <span>📅</span> <span>Reserva</span>
        </button>

        <button
          className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
          onClick={() => {
            onBlock();
            onClose();
          }}
          type="button"
        >
          <span>🚫</span> <span>Bloquear horario</span>
        </button>
      </div>
    </div>
  );
}
