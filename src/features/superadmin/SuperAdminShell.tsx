"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const NAV = [
  { href: "/superadmin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { href: "/superadmin/organizations", label: "Organizaciones", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
];

export default function SuperAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-stone-950/90 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-base font-extrabold">Super<span className="text-red-500">Admin</span></span>
              <span className="ml-2 text-[10px] text-white/30 uppercase tracking-wider">MarBrava Platform</span>
            </div>
            <nav className="hidden sm:flex items-center gap-1">
              {NAV.map((item) => {
                const active = pathname === item.href || (item.href !== "/superadmin" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/50 hover:text-white/80 hover:bg-white/5"
                    )}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-xs text-white/40 hover:text-white/70 transition"
          >
            {loggingOut ? "Saliendo..." : "Cerrar sesión"}
          </button>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="sm:hidden border-b border-white/10 px-4 py-2 flex gap-2">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/superadmin" && pathname?.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex-1 text-center rounded-lg py-2 text-xs font-medium transition",
              active ? "bg-white/10 text-white" : "text-white/40"
            )}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
