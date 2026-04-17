"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Menú del usuario en el toolbar del agenda.
 * Muestra nombre + iniciales, al click abre dropdown con:
 * - Mi Perfil (link)
 * - Cerrar sesión
 */
export default function UserMenu({
  name,
  role,
  initials,
}: {
  name: string;
  role?: string;
  initials: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-[#e8e2dc] bg-white pl-1 pr-2.5 py-1 hover:border-brand/40 transition"
        aria-label="Menú de usuario"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="grid h-7 w-7 place-items-center rounded-full bg-brand text-[11px] font-bold text-white">
          {initials}
        </div>
        <span className="text-[12px] font-medium text-stone-700 hidden md:inline">
          {name.split(" ")[0]}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={`text-stone-400 transition-transform hidden md:block ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 mt-1 z-30 w-56 rounded-lg border border-[#e8e2dc] bg-white shadow-xl overflow-hidden"
        >
          {/* Header del usuario */}
          <div className="px-3 py-2.5 border-b border-[#f0ece8] bg-stone-50/50">
            <div className="font-semibold text-[13px] text-stone-900 truncate">
              {name}
            </div>
            {role && (
              <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wide mt-0.5">
                {role}
              </div>
            )}
          </div>

          <Link
            href="/admin/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="w-full text-left px-3 py-2 text-[13px] text-stone-700 hover:bg-stone-50 transition flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-stone-500">
              <circle cx="10" cy="6" r="3" />
              <path d="M3 18c0-3.5 3-6 7-6s7 2.5 7 6" />
            </svg>
            Mi Perfil
          </Link>

          <Link
            href="/admin/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="w-full text-left px-3 py-2 text-[13px] text-stone-700 hover:bg-stone-50 transition flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-stone-500">
              <path d="M10 3l1.6 2.2 2.7-.4.3 2.7 2.2 1.6-1.5 2.3.5 2.7-2.6.7-1 2.5-2.6-.9-2.6.9-1-2.5-2.6-.7.5-2.7L2.4 9l2.2-1.6.3-2.7 2.7.4L10 3zm0 4.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />
            </svg>
            Configuración
          </Link>

          <div className="border-t border-[#f0ece8]" />

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full text-left px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition flex items-center gap-2 disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 18H5a2 2 0 01-2-2V4a2 2 0 012-2h3M14 14l4-4-4-4M18 10H8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {loggingOut ? "Saliendo..." : "Cerrar sesión"}
          </button>
        </div>
      )}
    </div>
  );
}
