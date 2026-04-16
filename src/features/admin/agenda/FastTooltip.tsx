"use client";

import { useState } from "react";

/**
 * Tooltip custom que aparece al hover sin el delay nativo del browser (~2s).
 * Usa CSS pure (hover pseudo) para evitar rerenders. Pensado para nombres
 * de barberos en columnas compactas donde solo se ve el avatar.
 */
export default function FastTooltip({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg pointer-events-none animate-[fadeIn_120ms_ease-out]"
        >
          {label}
          <span className="absolute left-1/2 -translate-x-1/2 bottom-full h-0 w-0 border-x-4 border-x-transparent border-b-4 border-b-stone-900" />
        </span>
      )}
    </span>
  );
}
