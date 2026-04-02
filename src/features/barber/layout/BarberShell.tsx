"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
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
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          {/* Brand + greeting */}
          <div>
            <div className="text-base font-extrabold tracking-tight">
              Mar<span className="text-[#c87941]">Brava</span>
            </div>
            <p className="text-[11px] text-white/40 hidden sm:block">{greeting}, {firstName}</p>
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
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 pt-4 pb-4">
        {children}
      </main>
    </div>
  );
}
