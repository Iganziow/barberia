"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import UserAvatarBadge from "@/components/ui/UserAvatarBadge";

type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  appointmentCount: number;
  lastVisitAt: string | null;
};

type ClientStats = {
  total: number;
  recurrent: number;
  new30d: number;
};

// ─── Helpers ───────────────────────────────────────────────────────────
function displayEmail(email: string | null) {
  if (!email) return null;
  if (email.includes("@placeholder") || email.includes("@noemail")) return null;
  return email;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "próximamente";
  if (diffDays === 0) return "hoy";
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays} días`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "hace 1 sem" : `hace ${weeks} sem`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? "hace 1 mes" : `hace ${months} meses`;
  }
  const years = Math.floor(diffDays / 365);
  return years === 1 ? "hace 1 año" : `hace ${years} años`;
}

// ─── Icons ─────────────────────────────────────────────────────────────
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 3a1 1 0 011 1v8.59l2.3-2.3a1 1 0 011.4 1.42l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.42l2.3 2.3V4a1 1 0 011-1zM4 16a1 1 0 012 0v1h8v-1a1 1 0 112 0v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

// ─── Componente ────────────────────────────────────────────────────────
export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [fetchError, setFetchError] = useState("");
  const pageSize = 50;

  const fetchClients = useCallback((query: string, pageNum: number) => {
    const params = new URLSearchParams({ list: "true", page: String(pageNum), pageSize: String(pageSize) });
    if (query) params.set("q", query);
    fetch(`/api/admin/clients?${params}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("No se pudieron cargar los clientes");
        return r.json();
      })
      .then((data) => {
        setClients(data.clients || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
        if (data.stats) setStats(data.stats);
        setFetchError("");
      })
      .catch((e: Error) => setFetchError(e.message || "Error de conexión"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchClients(search, page), search && page === 1 ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, page, fetchClients]);

  const displayedStats = stats ?? { total: 0, recurrent: 0, new30d: 0 };

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-[#e8e2dc]">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Clientes</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Historial de visitas, contacto y estadísticas
            {displayedStats.total > 0 && (
              <>
                {" · "}
                <span className="tabular-nums">
                  {displayedStats.total} cliente{displayedStats.total !== 1 ? "s" : ""} registrado{displayedStats.total !== 1 ? "s" : ""}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-start gap-4 sm:gap-8 flex-wrap">
          {/* Stats inline */}
          <div className="flex items-start gap-6 sm:gap-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Total</p>
              <p className="text-2xl font-extrabold text-stone-900 mt-0.5 tabular-nums">
                {displayedStats.total}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Recurrentes</p>
              <p className="text-2xl font-extrabold text-brand mt-0.5 tabular-nums">
                {displayedStats.recurrent}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Nuevos (30d)</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-0.5 tabular-nums">
                {displayedStats.new30d}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {total > 0 && (
              <a
                href={`/api/admin/clients/export${search ? `?q=${encodeURIComponent(search)}` : ""}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e2dc] bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:border-brand/40 hover:text-brand transition"
                title={search ? "Descargar CSV con los resultados actuales" : "Descargar CSV de todos los clientes"}
              >
                <IconDownload />
                Exportar CSV
              </a>
            )}
            <UserAvatarBadge />
          </div>
        </div>
      </div>

      {/* ── Search bar ─────────────────────────────────────────────── */}
      <div className="relative max-w-md">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
          <IconSearch />
        </span>
        <input
          className="w-full rounded-full border border-[#e8e2dc] bg-white pl-10 pr-9 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 transition"
          placeholder="Buscar por nombre, teléfono o email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(""); setPage(1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center h-5 w-5 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Limpiar búsqueda"
          >
            <IconX />
          </button>
        )}
      </div>

      {/* ── Error state ──────────────────────────────────────────── */}
      {fetchError && !loading && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{fetchError}</span>
          <button onClick={() => { setLoading(true); fetchClients(search, page); }} className="text-xs font-semibold underline hover:no-underline">Reintentar</button>
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────── */}
      {loading && (
        <div className="rounded-2xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-[#f0ece8]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-stone-50/60 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state (no results) ──────────────────────────────── */}
      {!loading && !fetchError && clients.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#e8e2dc] bg-white p-12 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-stone-100 text-stone-400">
            <IconSearch />
          </div>
          {search ? (
            <>
              <p className="text-base font-bold text-stone-800">
                Sin resultados para &quot;{search}&quot;
              </p>
              <p className="text-sm text-stone-500 mt-1">
                Intenta con otro término o revisa la ortografía.
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-bold text-stone-800">Aún no hay clientes</p>
              <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">
                Los clientes aparecen aquí automáticamente cuando reservan una cita.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Table / cards ─────────────────────────────────────────── */}
      {!loading && !fetchError && clients.length > 0 && (
        <div className="rounded-2xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
          {/* Desktop table header */}
          <div className="hidden md:grid grid-cols-[1.5fr_1fr_1.5fr_1fr_100px] gap-4 px-6 py-3 bg-stone-50/50 border-b border-[#e8e2dc]">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Nombre</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Teléfono</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Email</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Última visita</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 text-right">Citas</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#f0ece8]">
            {clients.map((c) => (
              <Link
                key={c.id}
                href={`/admin/clients/${c.id}`}
                className="group grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1.5fr_1fr_100px] gap-2 md:gap-4 px-5 md:px-6 py-3.5 hover:bg-stone-50/60 transition items-center"
              >
                {/* Name */}
                <span className="font-bold text-stone-900 group-hover:text-brand truncate transition">
                  {c.name}
                </span>

                {/* Phone */}
                <span className="text-sm text-brand tabular-nums truncate">
                  <span className="md:hidden text-stone-400 font-normal mr-1">Teléfono:</span>
                  {c.phone || "—"}
                </span>

                {/* Email */}
                <span className="text-sm text-brand truncate">
                  <span className="md:hidden text-stone-400 font-normal mr-1">Email:</span>
                  {displayEmail(c.email) || "—"}
                </span>

                {/* Last visit */}
                <span className="text-sm text-stone-500">
                  <span className="md:hidden text-stone-400 font-normal mr-1">Última visita:</span>
                  {relativeTime(c.lastVisitAt)}
                </span>

                {/* Appointment badge */}
                <span className="md:text-right">
                  <span className="inline-flex items-center rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand tabular-nums">
                    {c.appointmentCount} {c.appointmentCount === 1 ? "cita" : "citas"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────── */}
      {!loading && clients.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-stone-500 tabular-nums">
            Página {page} de {totalPages} · {total} clientes
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setLoading(true); setPage((p) => Math.max(1, p - 1)); }}
              disabled={page <= 1}
              className="rounded-md border border-[#e8e2dc] bg-white px-3 py-1.5 text-xs font-medium text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-brand/40 hover:text-brand transition"
            >
              ← Anterior
            </button>
            <button
              onClick={() => { setLoading(true); setPage((p) => Math.min(totalPages, p + 1)); }}
              disabled={page >= totalPages}
              className="rounded-md border border-[#e8e2dc] bg-white px-3 py-1.5 text-xs font-medium text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-brand/40 hover:text-brand transition"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
