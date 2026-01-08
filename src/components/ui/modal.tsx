"use client";

import { useEffect } from "react";

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        {/* ✅ text-black BLINDA TODO el modal */}
        <div className="w-full max-w-lg rounded-lg bg-white shadow-lg text-black">
          <div className="border-b px-4 py-3 flex items-center justify-between bg-white text-black">
            {/* ✅ title negro sí o sí */}
            <h3 className="font-semibold text-black">{title}</h3>

            <button
              className="text-gray-600 hover:text-black"
              onClick={onClose}
              aria-label="Cerrar"
              type="button"
            >
              ✕
            </button>
          </div>

          {/* ✅ contenido negro por defecto */}
          <div className="px-4 py-4 text-black">{children}</div>

          {footer && (
            <div className="border-t px-4 py-3 bg-white text-black">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
