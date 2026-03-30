"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconList({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

type View = "list" | "calendar";

type BarberShellProps = {
  children: ReactNode;
  name: string;
  initials: string;
  view: View;
  onViewChange: (v: View) => void;
};

export default function BarberShell({
  children,
  name,
  initials,
  view,
  onViewChange,
}: BarberShellProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const firstName = name.split(" ")[0] || "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#faf8f6] flex flex-col">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 bg-[#1a1412] text-white">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          {/* Brand + greeting */}
          <div>
            <div className="text-base font-extrabold tracking-tight">
              Mar<span className="text-[#c87941]">Brava</span>
            </div>
            <p className="text-[11px] text-white/40 hidden sm:block">{greeting}, {firstName}</p>
          </div>

          {/* View tabs */}
          <div className="flex items-center gap-0.5 rounded-lg bg-white/10 p-0.5">
            <button
              onClick={() => onViewChange("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition",
                view === "list"
                  ? "bg-white text-stone-800 shadow-sm"
                  : "text-white/60 hover:text-white"
              )}
            >
              <IconList className="shrink-0" />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              onClick={() => onViewChange("calendar")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition",
                view === "calendar"
                  ? "bg-white text-stone-800 shadow-sm"
                  : "text-white/60 hover:text-white"
              )}
            >
              <IconCalendar className="shrink-0" />
              <span className="hidden sm:inline">Calendario</span>
            </button>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-full bg-white/10 pl-1 pr-3 py-1 hover:bg-white/15 transition"
            >
              <div className="grid h-7 w-7 place-items-center rounded-full bg-[#c87941] text-xs font-bold shrink-0">
                {initials || "?"}
              </div>
              <span className="text-xs font-medium text-white/80 hidden sm:block">
                {firstName}
              </span>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 w-48 rounded-xl border border-[#e8e2dc] bg-white shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#e8e2dc]">
                    <p className="text-sm font-semibold text-stone-800">{name}</p>
                    <p className="text-[11px] text-stone-400">Barbero</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-sm text-stone-600 hover:bg-stone-50 transition",
                      loggingOut && "opacity-50"
                    )}
                  >
                    <IconLogout className="text-stone-400" />
                    {loggingOut ? "Saliendo..." : "Cerrar sesión"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 pt-4 pb-16 lg:pb-4 overflow-hidden">
        {children}
      </main>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-[#e8e2dc] bg-white/95 backdrop-blur-sm lg:hidden z-30">
        <div className="mx-auto max-w-2xl flex items-center justify-around py-2">
          <button
            onClick={() => onViewChange("list")}
            className={cn(
              "flex flex-col items-center gap-0.5 px-6 py-1 text-[10px] font-medium transition",
              view === "list" ? "text-[#c87941]" : "text-stone-400"
            )}
          >
            <IconList className={view === "list" ? "text-[#c87941]" : "text-stone-300"} />
            Lista
          </button>
          <button
            onClick={() => onViewChange("calendar")}
            className={cn(
              "flex flex-col items-center gap-0.5 px-6 py-1 text-[10px] font-medium transition",
              view === "calendar" ? "text-[#c87941]" : "text-stone-400"
            )}
          >
            <IconCalendar className={view === "calendar" ? "text-[#c87941]" : "text-stone-300"} />
            Calendario
          </button>
        </div>
      </nav>
    </div>
  );
}
