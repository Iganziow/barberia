"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 4.5L6 7.5L9 4.5" />
    </svg>
  );
}

type BarberShellProps = {
  children: ReactNode;
  name: string;
  initials: string;
};

export default function BarberShell({
  children,
  name,
  initials,
}: BarberShellProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const firstName = name.split(" ")[0] || "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";

  // Cerrar dropdown con click outside + ESC
  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
      } else {
        setLoggingOut(false);
        alert("No se pudo cerrar sesión. Intenta de nuevo.");
      }
    } catch {
      setLoggingOut(false);
      alert("Error de conexión al cerrar sesión.");
    }
  }

  const today = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen bg-[#faf8f6] flex flex-col">
      {/* ── Top bar — dark espresso con acento cobre ── */}
      <header className="sticky top-0 z-30 bg-[#1a1412] text-white border-b border-black/20">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-lg font-extrabold tracking-tight shrink-0">
              Mar<span className="text-brand">Brava</span>
            </div>
            <div className="hidden sm:block h-6 w-px bg-white/10 shrink-0" />
            <p className="text-[11px] text-white/50 hidden sm:block truncate capitalize">
              {greeting}, <span className="text-white/80 font-medium">{firstName}</span> · {today}
            </p>
          </div>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full bg-white/10 pl-1 pr-3 py-1 hover:bg-white/15 transition border border-white/10"
              aria-label="Menú de usuario"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <div className="grid h-7 w-7 place-items-center rounded-full bg-brand text-xs font-bold shrink-0">
                {initials || "?"}
              </div>
              <span className="text-xs font-semibold text-white/90 hidden sm:block truncate max-w-[120px]">
                {firstName}
              </span>
              <IconChevron className={cn("text-white/40 transition-transform hidden sm:block", menuOpen && "rotate-180")} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 z-40 w-56 rounded-xl border border-[#e8e2dc] bg-white shadow-xl overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-[#f0ece8] bg-stone-50/50">
                  <p className="text-sm font-bold text-stone-900 truncate">{name}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mt-0.5">
                    Barbero
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition",
                    loggingOut && "opacity-50"
                  )}
                >
                  <IconLogout className="text-red-400" />
                  {loggingOut ? "Saliendo..." : "Cerrar sesión"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Greeting en mobile (debajo de la top bar) */}
        <div className="sm:hidden px-4 pb-2 pt-0">
          <p className="text-[11px] text-white/50 truncate capitalize">
            {greeting}, <span className="text-white/80 font-medium">{firstName}</span>
          </p>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 pt-4 pb-6">
        {children}
      </main>
    </div>
  );
}
