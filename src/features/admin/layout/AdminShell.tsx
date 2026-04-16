"use client";

import { type ReactNode, useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/use-auth-user";
import TourOverlay from "@/components/ui/Tour";

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
function IconGear({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
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
  { href: "/admin/settings", label: "Configuración", Icon: IconGear, tourId: "nav-settings" },
  { href: "/admin/profile", label: "Mi Perfil", Icon: IconUser, tourId: "nav-perfil" },
];

const NAV_COLLAPSED_KEY = "admin_nav_collapsed_v1";

// External store para leer el colapso del nav desde localStorage sin
// caer en setState-within-effect (prohibido por react-hooks/set-state-in-effect).
function subscribeNavCollapsed(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}
function getNavCollapsedSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(NAV_COLLAPSED_KEY) === "1";
}
function getNavCollapsedServerSnapshot(): boolean {
  return false;
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthUser();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navCollapsed = useSyncExternalStore(
    subscribeNavCollapsed,
    getNavCollapsedSnapshot,
    getNavCollapsedServerSnapshot
  );
  // Hover expande temporalmente el rail sin tocar la preferencia persistida
  const [navHovered, setNavHovered] = useState(false);

  const toggleCollapsed = useCallback(() => {
    if (typeof window === "undefined") return;
    const next = !getNavCollapsedSnapshot();
    try {
      window.localStorage.setItem(NAV_COLLAPSED_KEY, next ? "1" : "0");
      // Disparamos un evento storage "sintético" para que useSyncExternalStore
      // re-lea la snapshot y React re-renderice con el nuevo valor.
      window.dispatchEvent(new StorageEvent("storage", { key: NAV_COLLAPSED_KEY }));
    } catch {}
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const displayName = user?.name ?? "...";
  const initials = displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  // Cuando está colapsado y no hay hover, mostramos el rail compacto.
  const showCompact = navCollapsed && !navHovered;

  // En desktop el aside es SIEMPRE position:fixed para no afectar el layout
  // del contenido. Un div-spacer invisible ocupa el ancho del rail en flow.
  // En hover se expande a 240px superpuesto al contenido (sin reflow).
  const isExpanded = !showCompact; // hover o persistido

  return (
    <div className="min-h-screen bg-[#faf8f6]">
      <div className="flex min-h-screen">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
        )}

        {/* Spacer: reserva 56px en el flow para que el contenido no quede
            debajo del rail. Solo aplica en desktop (mobile usa drawer). */}
        <div className="hidden lg:block shrink-0" style={{ width: 56 }} />

        {/* ── Sidebar (siempre fixed en desktop, overlay al expandir) ── */}
        <aside
          onMouseEnter={() => setNavHovered(true)}
          onMouseLeave={() => setNavHovered(false)}
          className={cn(
            "fixed inset-y-0 left-0 z-50 bg-[#1a1412] text-white overflow-hidden",
            "transition-transform duration-200",
            sidebarOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
            "lg:translate-x-0",
            // Sombra al expandir sobre el contenido
            isExpanded ? "shadow-2xl shadow-black/30" : ""
          )}
          style={{ width: isExpanded ? 240 : 56 }}
        >
          {/* Brand */}
          <div className="flex items-center justify-between px-4 py-3 h-[52px]">
            {showCompact ? (
              <div className="w-full flex justify-center">
                <div className="grid h-8 w-8 place-items-center rounded-md bg-brand text-white text-sm font-extrabold">
                  M
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-hidden whitespace-nowrap">
                  <div className="text-lg font-extrabold tracking-tight">
                    Mar<span className="text-brand">Brava</span>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden rounded-lg p-1 text-white/40 hover:text-white hover:bg-white/10 shrink-0">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 4L4 14M4 4l10 10" /></svg>
                </button>
              </>
            )}
          </div>

          {/* Nav */}
          <nav className="mt-1 px-2" data-tour-id="sidebar-nav">
            {!showCompact && (
              <div className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-widest text-white/30">
                Gestión
              </div>
            )}
            <div className="space-y-0.5">
              {NAV.map((item) => {
                const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    data-tour-id={item.tourId}
                    title={showCompact ? item.label : undefined}
                    className={cn(
                      "relative group flex items-center rounded-lg text-[13px] font-medium transition-all nav-indicator overflow-hidden",
                      showCompact ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 py-2",
                      active
                        ? "bg-gradient-to-r from-brand/20 via-brand/10 to-transparent text-brand shadow-[inset_3px_0_0_0_var(--accent)]"
                        : "text-white/60 hover:bg-white/5 hover:text-white/90"
                    )}
                  >
                    <item.Icon
                      className={cn(
                        "shrink-0",
                        active ? "text-brand" : "text-white/40 group-hover:text-white/70"
                      )}
                    />
                    {!showCompact && (
                      <>
                        <span className="whitespace-nowrap">{item.label}</span>
                        {active && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_8px_var(--accent)]" aria-hidden="true" />
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>

            {!showCompact && (
              <div className="mt-6 mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-widest text-white/30">
                Cuenta
              </div>
            )}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title={showCompact ? "Cerrar sesión" : undefined}
              className={cn(
                "flex items-center rounded-lg text-[13px] font-medium text-white/40 hover:bg-white/5 hover:text-white/70 transition disabled:opacity-50 overflow-hidden",
                showCompact ? "justify-center h-10 w-10 mx-auto mt-2" : "gap-3 px-3 py-2 w-full"
              )}
            >
              <IconLogout className="shrink-0 text-white/30" />
              {!showCompact && (
                <span className="whitespace-nowrap">{loggingOut ? "Saliendo..." : "Cerrar sesión"}</span>
              )}
            </button>

            {/* Toggle collapse/expand (desktop only) */}
            <button
              onClick={toggleCollapsed}
              title={navCollapsed ? "Fijar menú abierto" : "Colapsar menú"}
              aria-label={navCollapsed ? "Fijar menú abierto" : "Colapsar menú"}
              className={cn(
                "hidden lg:flex items-center rounded-lg text-[11px] font-medium text-white/30 hover:bg-white/5 hover:text-white/60 transition mt-4",
                showCompact ? "justify-center h-10 w-10 mx-auto" : "gap-2 px-3 py-2 w-full"
              )}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                {navCollapsed ? <path d="M6 4l4 4-4 4" /> : <path d="M10 4L6 8l4 4" />}
              </svg>
              {!showCompact && <span className="whitespace-nowrap">Colapsar</span>}
            </button>
          </nav>
        </aside>

        {/* ── Main area (sin topbar en desktop — el avatar va en el header de cada página) ── */}
        <div className="flex min-w-0 flex-1 flex-col pb-14 lg:pb-0">
          {/* Topbar mobile-only: hamburger + brand. Desktop: no se muestra. */}
          <header className="lg:hidden sticky top-0 z-30 border-b border-[#e8e2dc] bg-white/80 backdrop-blur-sm" data-tour-id="topbar-stats">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
                </button>
                <div className="text-base font-extrabold tracking-tight text-stone-800">
                  Mar<span className="text-brand">Brava</span>
                </div>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                {initials}
              </div>
            </div>
          </header>

          {/* Content — sin padding vertical en desktop (la agenda controla su propio spacing) */}
          <main className="flex-1 px-4 py-4 lg:px-0 lg:py-0">
            <div className="mx-auto w-full max-w-[1400px] lg:max-w-none lg:px-0">{children}</div>
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
