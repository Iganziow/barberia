"use client";

import { useEffect, useRef } from "react";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener("keydown", onKeyDown);
      // Focus the dialog on open
      setTimeout(() => dialogRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Return focus when closing
      if (!open && previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabIndex={-1}
          className="w-full max-w-lg rounded-xl border border-[#e8e2dc] bg-white shadow-2xl text-stone-900 max-h-[90vh] flex flex-col outline-none"
        >
          {/* Header */}
          <div className="border-b border-[#e8e2dc] px-5 py-3.5 flex items-center justify-between shrink-0">
            <h3 id="modal-title" className="font-bold text-stone-900">{title}</h3>
            <button
              className="grid h-7 w-7 place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition focus:outline-none focus:ring-2 focus:ring-[#c87941]/40"
              onClick={onClose}
              aria-label="Cerrar"
              type="button"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 3L3 11M3 3l8 8" /></svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 overflow-y-auto flex-1 text-stone-900">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-[#e8e2dc] px-5 py-3.5 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
