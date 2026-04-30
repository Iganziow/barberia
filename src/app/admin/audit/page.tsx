"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

type AuditLogEntry = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

/** Mapeo action → label en español + color del badge. */
const ACTION_META: Record<string, { label: string; color: string }> = {
  "auth.login": { label: "Login", color: "bg-emerald-100 text-emerald-700" },
  "auth.logout": { label: "Logout", color: "bg-stone-100 text-stone-700" },
  "auth.logout_all": { label: "Cerrar todas sesiones", color: "bg-amber-100 text-amber-700" },
  "auth.password_change": { label: "Cambio password", color: "bg-amber-100 text-amber-700" },
  "barber.create": { label: "Barbero creado", color: "bg-emerald-100 text-emerald-700" },
  "barber.update": { label: "Barbero editado", color: "bg-blue-100 text-blue-700" },
  "barber.deactivate": { label: "Barbero desactivado", color: "bg-red-100 text-red-700" },
  "service.create": { label: "Servicio creado", color: "bg-emerald-100 text-emerald-700" },
  "service.update": { label: "Servicio editado", color: "bg-blue-100 text-blue-700" },
  "service.delete": { label: "Servicio borrado", color: "bg-red-100 text-red-700" },
  "branch.create": { label: "Sucursal creada", color: "bg-emerald-100 text-emerald-700" },
  "client.bulk_import": { label: "Import masivo clientes", color: "bg-blue-100 text-blue-700" },
  "apikey.create": { label: "API key creada", color: "bg-amber-100 text-amber-700" },
  "apikey.revoke": { label: "API key revocada", color: "bg-red-100 text-red-700" },
};

const FILTER_GROUPS: Array<{ label: string; actions: string[] }> = [
  { label: "Todas", actions: [] },
  { label: "Logins", actions: ["auth.login", "auth.logout", "auth.logout_all"] },
  { label: "API Keys", actions: ["apikey.create", "apikey.revoke"] },
  { label: "Barberos", actions: ["barber.create", "barber.update", "barber.deactivate"] },
  { label: "Servicios", actions: ["service.create", "service.update", "service.delete"] },
  { label: "Imports", actions: ["client.bulk_import"] },
];

function formatRelative(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = now - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function formatExact(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("Todas");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      const filter = FILTER_GROUPS.find((f) => f.label === activeFilter);
      const actions = filter?.actions ?? [];

      // Si hay múltiples actions, hacemos N requests en paralelo y mergeamos.
      // (El endpoint solo soporta filter por 1 action). Más simple: fetch
      // todo y filtrar en cliente cuando hay múltiples.
      const allFetch = actions.length === 0 || actions.length > 1;

      const params = new URLSearchParams({ limit: "50" });
      if (cursor) params.set("cursor", cursor);
      if (actions.length === 1) params.set("action", actions[0]);

      try {
        const res = await fetch(`/api/admin/audit?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        let newItems: AuditLogEntry[] = data.items;

        // Filtro client-side si hay múltiples actions
        if (!allFetch && actions.length > 1) {
          newItems = newItems.filter((i) => actions.includes(i.action));
        } else if (actions.length > 1) {
          newItems = newItems.filter((i) => actions.includes(i.action));
        }

        setItems((prev) => (append ? [...prev, ...newItems] : newItems));
        setNextCursor(data.nextCursor);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error de conexión");
      }
    },
    [activeFilter]
  );

  useEffect(() => {
    setLoading(true);
    fetchPage(null, false).finally(() => setLoading(false));
  }, [fetchPage]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    await fetchPage(nextCursor, true);
    setLoadingMore(false);
  }

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, AuditLogEntry[]>();
    for (const i of items) {
      const day = i.createdAt.slice(0, 10);
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day)!.push(i);
    }
    return Array.from(groups.entries());
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-stone-900">Auditoría</h1>
          <p className="mt-1 text-xs text-stone-500">
            Registro de acciones administrativas. Útil para forense, compliance, y debug.
          </p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scroll-shadow-x">
        {FILTER_GROUPS.map((f) => {
          const active = f.label === activeFilter;
          return (
            <button
              key={f.label}
              type="button"
              onClick={() => setActiveFilter(f.label)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition ${
                active
                  ? "bg-stone-900 text-white border-stone-900"
                  : "bg-white text-stone-600 border-[#e8e2dc] hover:border-stone-300"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
          title="No hay actividad registrada"
          description="Cuando hagas acciones (crear barbero, generar API key, etc) aparecerán acá."
        />
      ) : (
        <div className="space-y-5">
          {groupedByDay.map(([day, dayItems]) => (
            <section key={day}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                {new Date(day + "T12:00:00").toLocaleDateString("es-CL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h2>
              <div className="rounded-xl border border-[#e8e2dc] bg-white overflow-hidden">
                <ul className="divide-y divide-[#f0ece8]">
                  {dayItems.map((item) => {
                    const meta = ACTION_META[item.action] ?? {
                      label: item.action,
                      color: "bg-stone-100 text-stone-700",
                    };
                    return (
                      <li key={item.id} className="p-3 hover:bg-stone-50/40 transition">
                        <div className="flex items-start gap-3 flex-wrap">
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.color}`}
                          >
                            {meta.label}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-stone-800 truncate">
                              {item.userEmail ?? "(sistema)"}
                              {item.userRole && (
                                <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                                  {item.userRole}
                                </span>
                              )}
                            </p>
                            {item.metadata != null && (
                              <p className="mt-1 text-[11px] text-stone-500 font-mono break-all">
                                {JSON.stringify(item.metadata)}
                              </p>
                            )}
                            <p className="mt-1 text-[10px] text-stone-400">
                              {item.ip && `IP: ${item.ip}`}
                              {item.resourceId && ` · ${item.resource}: ${item.resourceId.slice(0, 12)}…`}
                            </p>
                          </div>
                          <time
                            dateTime={item.createdAt}
                            title={formatExact(item.createdAt)}
                            className="shrink-0 text-[11px] text-stone-400 tabular-nums"
                          >
                            {formatRelative(item.createdAt)}
                          </time>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))}

          {nextCursor && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-lg border border-[#e8e2dc] bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition disabled:opacity-50"
              >
                {loadingMore ? "Cargando..." : "Cargar más"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
