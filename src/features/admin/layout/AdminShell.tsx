"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const NAV = [
  { href: "/admin", label: "Agenda" },
  { href: "/admin/profile", label: "Mi Perfil" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-[260px] shrink-0 border-r border-gray-200 bg-[#0b1220] text-white">
          <div className="px-5 py-5">
            <div className="flex items-center gap-2">
              <div className="text-lg font-extrabold tracking-tight">
                Mar<span className="text-violet-400">Brava</span>
              </div>
            </div>
            <div className="mt-1 text-xs text-white/70">
              Panel de administración
            </div>
          </div>

          <nav className="px-3 pb-6">
            <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Menú
            </div>

            <div className="space-y-1">
              {NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname?.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                      active
                        ? "bg-violet-600 text-white shadow-sm"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        active ? "bg-white" : "bg-white/40"
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-4 px-6 py-3">
              {/* Search */}
              <div className="flex flex-1 items-center gap-3">
                <div className="relative w-full max-w-xl">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    🔎
                  </span>
                  <input
                    className="w-full rounded-xl border border-gray-200 bg-white px-9 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    placeholder="Buscar cliente, servicio, etc..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50">
                  Ayuda
                </button>

                <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-2">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-gray-900 text-xs font-bold text-white">
                    DS
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-gray-900">
                      daniel Silva
                    </div>
                    <div className="text-[11px] font-semibold tracking-wide text-gray-500">
                      ADMIN
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Content container */}
          <main className="flex-1 px-6 py-6">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
