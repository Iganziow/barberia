"use client";

import { useEffect, useRef, useState } from "react";

export default function AgendaHeader({
  onNewReservation,
  onNewBlock,
}: {
  onNewReservation: () => void;
  onNewBlock: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold">Agenda</h1>
        <p className="text-sm text-gray-500">Vista semanal tipo AgendaPro</p>
      </div>

      <div className="relative" ref={ref}>
        <button
          className="bg-violet-600 text-white px-4 py-2 rounded-md hover:bg-violet-700"
          onClick={() => setOpen((v) => !v)}
        >
          Nuevo ▾
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow border overflow-hidden z-50">
            <button
              className="w-full text-left px-4 py-3 hover:bg-gray-50"
              onClick={() => {
                setOpen(false);
                onNewReservation();
              }}
            >
              Reserva
            </button>
            <button
              className="w-full text-left px-4 py-3 hover:bg-gray-50"
              onClick={() => {
                setOpen(false);
                onNewBlock();
              }}
            >
              Bloquear horario
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
