"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

/**
 * Breadcrumbs server-aware basado en el pathname actual.
 *
 * Mapeo path → label:
 *   /admin                  → Inicio
 *   /admin/clients          → Clientes
 *   /admin/clients/[id]     → Clientes / [Detalle]
 *   /admin/integrations     → Integraciones
 *   etc.
 *
 * Uso:
 *   <Breadcrumbs />         // auto-detecta del pathname
 *   <Breadcrumbs items={[   // override custom (ej. en pages dinámicas)
 *     { href: "/admin", label: "Inicio" },
 *     { href: "/admin/clients", label: "Clientes" },
 *     { label: "Carlos Muñoz" },  // sin href = current page
 *   ]} />
 *
 * Accesibilidad: usa <nav aria-label="breadcrumb"> + lista ordenada.
 */

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Inicio",
  branches: "Sucursales",
  barbers: "Barberos",
  schedule: "Horarios",
  services: "Servicios",
  clients: "Clientes",
  reports: "Reportes",
  integrations: "Integraciones",
  settings: "Configuración",
  profile: "Mi Perfil",
  superadmin: "SuperAdmin",
  organizations: "Organizaciones",
  new: "Nueva",
  audit: "Auditoría",
};

export type Crumb = {
  href?: string;
  label: string;
};

function IconHome() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" />
    </svg>
  );
}
function IconChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

function deriveCrumbsFromPath(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  // Primero siempre es "Inicio"
  const root = segments[0]; // admin / barber / superadmin
  if (!SEGMENT_LABELS[root]) return [];

  const crumbs: Crumb[] = [{ href: `/${root}`, label: SEGMENT_LABELS[root] }];

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const href = "/" + segments.slice(0, i + 1).join("/");
    const isLast = i === segments.length - 1;
    // Si es un id (cuid/uuid o número largo), lo mostramos como "Detalle"
    const isLikelyId = /^[a-z0-9]{8,}$/i.test(seg) || /^\d+$/.test(seg);
    const label = SEGMENT_LABELS[seg] ?? (isLikelyId ? "Detalle" : seg);
    crumbs.push({ href: isLast ? undefined : href, label });
  }
  return crumbs;
}

export default function Breadcrumbs({
  items,
  className = "",
}: {
  items?: Crumb[];
  className?: string;
}) {
  const pathname = usePathname();
  const computed = useMemo(
    () => items ?? deriveCrumbsFromPath(pathname || ""),
    [items, pathname]
  );

  if (computed.length === 0) return null;

  return (
    <nav aria-label="breadcrumb" className={`text-xs ${className}`}>
      <ol className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
        {computed.map((c, i) => {
          const isFirst = i === 0;
          const isLast = i === computed.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5 min-w-0">
              {!isFirst && <span className="text-stone-300 dark:text-stone-600 shrink-0"><IconChevron /></span>}
              {c.href && !isLast ? (
                <Link
                  href={c.href}
                  className="flex items-center gap-1 hover:text-stone-900 dark:hover:text-stone-100 transition truncate"
                >
                  {isFirst && <IconHome />}
                  <span className="truncate">{c.label}</span>
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="flex items-center gap-1 font-semibold text-stone-900 dark:text-stone-100 truncate"
                >
                  {isFirst && <IconHome />}
                  <span className="truncate">{c.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
