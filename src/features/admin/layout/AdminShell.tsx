"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useQuickStats } from "@/hooks/use-quick-stats";
import TourOverlay from "@/components/ui/Tour";
import { formatCLP, formatTime } from "@/lib/format";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* ── SVG Icons (20x20) ── */
function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}
function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  );
}
function IconDollar({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function IconScissors({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
    </svg>
  );
}

function IconTeam({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M12 15c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z" /><circle cx="12" cy="9" r="3" /><path d="M20 18v1M20 14c-1 0-2 .5-2.5 1M4 18v1M4 14c1 0 2 .5 2.5 1" />
    </svg>
  );
}

function IconClock2({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
    </svg>
  );
}
function IconPlug({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

const NAV = [
  { href: "/admin", label: "Agenda", Icon: IconCalendar, tourId: "nav-agenda" },
  { href: "/admin/barbers", label: "Barberos", Icon: IconTeam, tourId: "nav-barberos" },
  { href: "/admin/schedule", label: "Horarios", Icon: IconClock2, tourId: "nav-horarios" },
  { href: "/admin/services", label: "Servicios", Icon: IconScissors, tourId: "nav-servicios" },
  { href: "/admin/clients", label: "Clientes", Icon: IconUsers, tourId: "nav-clientes" },
  { href: "/admin/reports", label: "Reportes", Icon: IconChart, tourId: "nav-reportes" },
  { href: "/admin/integrations", label: "Integraciones", Icon: IconPlug, tourId: "nav-integraciones" },
  { href: "/admin/profile", label: "Mi Perfil", Icon: IconUser, tourId: "nav-perfil" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthUser();
  const stats = useQuickStats();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const displayName = user?.name ?? "...";
  const initials = displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-[#faf8f6]">
      <div className="flex min-h-screen">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── Sidebar ── */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[240px] shrink-0 bg-[#1a1412] text-white transition-transform duration-200",
            "lg:static lg:translate-x-0",
            sidebarOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"
          )}
        >
          {/* Brand */}
          <div className="flex items-center justify-between px-5 py-5">
            <div>
              <div className="text-lg font-extrabold tracking-tight">
                Mar<span className="text-brand">Brava</span>
              </div>
              <div className="mt-0.5 text-[11px] text-white/50">Panel de administración</div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden rounded-lg p-1 text-white/40 hover:text-white hover:bg-white/10">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 4L4 14M4 4l10 10" /></svg>
            </button>
          </div>

          {/* Nav */}
          <nav className="px-3 mt-2" data-tour-id="sidebar-nav">
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">
              Gestión
            </div>
            <div className="space-y-0.5">
              {NAV.map((item) => {
                const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    data-tour-id={item.tourId}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
                      active
                        ? "border-l-[3px] border-l-brand bg-brand/15 text-brand ml-0"
                        : "text-white/60 hover:bg-white/5 hover:text-white/90 border-l-[3px] border-l-transparent"
                    )}
                  >
                    <item.Icon className={cn("shrink-0", active ? "text-brand" : "text-white/40")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">
              Cuenta
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-white/40 hover:bg-white/5 hover:text-white/70 transition border-l-[3px] border-l-transparent disabled:opacity-50"
            >
              <IconLogout className="shrink-0 text-white/30" />
              {loggingOut ? "Saliendo..." : "Cerrar sesión"}
            </button>
          </nav>
        </aside>

        {/* ── Main area ── */}
        <div className="flex min-w-0 flex-1 flex-col pb-14 lg:pb-0">
          {/* Topbar */}
          <header className="sticky top-0 z-30 border-b border-[#e8e2dc] bg-white/80 backdrop-blur-sm" data-tour-id="topbar-stats">
            <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-5">
              {/* Left: hamburger + brand mobile */}
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden rounded-lg p-1.5 text-stone-500 hover:bg-stone-100">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
                </button>
                <div className="lg:hidden text-base font-extrabold tracking-tight text-stone-800">
                  Mar<span className="text-brand">Brava</span>
                </div>
              </div>

              {/* Center: Quick stats (desktop only) */}
              <div className="hidden lg:flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <IconCalendar className="h-4 w-4 text-brand" />
                  <div>
                    <div className="text-[10px] text-stone-400 leading-none">Citas hoy</div>
                    <div className="text-sm font-semibold text-stone-800">{stats?.appointmentCount ?? "—"}</div>
                  </div>
                </div>
                <div className="h-6 w-px bg-[#e8e2dc]" />
                <div className="flex items-center gap-2">
                  <IconClock className="h-4 w-4 text-brand" />
                  <div>
                    <div className="text-[10px] text-stone-400 leading-none">Próxima</div>
                    <div className="text-sm font-semibold text-stone-800">
                      {stats?.nextAppointmentTime ? formatTime(stats.nextAppointmentTime) : "—"}
                    </div>
                  </div>
                </div>
                <div className="h-6 w-px bg-[#e8e2dc]" />
                <div className="flex items-center gap-2">
                  <IconDollar className="h-4 w-4 text-brand" />
                  <div>
                    <div className="text-[10px] text-stone-400 leading-none">Ingreso hoy</div>
                    <div className="text-sm font-semibold text-stone-800">
                      {stats ? formatCLP(stats.todayRevenue) : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: User */}
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-2.5 rounded-full border border-[#e8e2dc] bg-white px-3 py-1.5">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                    {initials}
                  </div>
                  <div className="leading-tight pr-1">
                    <div className="text-sm font-semibold text-stone-800">{displayName}</div>
                    <div className="text-[10px] font-medium text-stone-400">{user?.role ?? "..."}</div>
                  </div>
                </div>
                <div className="md:hidden grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                  {initials}
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 px-4 py-4 lg:px-6 lg:py-5">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>

        {/* ── Bottom nav (mobile) ── */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#e8e2dc] bg-white lg:hidden">
          <div className="flex items-center justify-around py-1">
            {NAV.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-1.5 py-1 text-[9px] font-medium transition min-w-0",
                    active ? "text-brand" : "text-stone-400"
                  )}
                >
                  <item.Icon className={cn("h-5 w-5 shrink-0", active ? "text-brand" : "text-stone-300")} />
                  <span className="truncate max-w-[48px]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Tour */}
        <TourOverlay />
      </div>
    </div>
  );
}
