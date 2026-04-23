"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/use-auth-user";

/**
 * Avatar-only badge del usuario para usar en el header de cada módulo admin.
 *
 * Diseño: solo un círculo con las iniciales en brand copper — sin texto
 * visible del nombre (ya está en el sidebar). Al click abre un dropdown
 * compacto con Mi Perfil · Configuración · Cerrar sesión.
 *
 * Uso: `<UserAvatarBadge />` — autoresuelve el usuario via useAuthUser.
 */
export default function UserAvatarBadge() {
  const { user } = useAuthUser();
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

  if (!user) {
    // Placeholder mientras carga, del mismo tamaño para no causar layout shift
    return <div className="h-10 w-10 rounded-full bg-stone-100 animate-pulse" aria-hidden />;
  }

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid h-10 w-10 place-items-center rounded-full bg-brand text-sm font-bold text-white shadow-sm shadow-brand/20 hover:bg-brand-hover transition focus:outline-none focus:ring-2 focus:ring-brand/40"
        aria-label={`Menú de usuario: ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 mt-2 z-40 w-56 rounded-lg border border-[#e8e2dc] bg-white shadow-xl overflow-hidden"
        >
          {/* Header del usuario */}
          <div className="px-3 py-2.5 border-b border-[#f0ece8] bg-stone-50/50">
            <div className="font-semibold text-[13px] text-stone-900 truncate">
              {user.name}
            </div>
            {user.role && (
              <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wide mt-0.5">
                {user.role}
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

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full text-left px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition flex items-center gap-2 border-t border-[#f0ece8] disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 17H5a2 2 0 01-2-2V5a2 2 0 012-2h3M13 14l4-4-4-4M17 10H7" />
            </svg>
            {loggingOut ? "Saliendo..." : "Cerrar sesión"}
          </button>
        </div>
      )}
    </div>
  );
}
