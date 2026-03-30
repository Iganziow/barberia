"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  appointmentCount: number;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchClients = useCallback((query: string) => {
    const params = new URLSearchParams({ list: "true" });
    if (query) params.set("q", query);
    fetch(`/api/admin/clients?${params}`)
      .then((r) => (r.ok ? r.json() : { clients: [] }))
      .then((data) => setClients(data.clients || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchClients(search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, fetchClients]);

  const displayEmail = (email: string | null) =>
    !email || email.includes("@placeholder") ? null : email;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900">
          Clientes
        </h1>
        <p className="text-sm text-stone-500">
          Historial de visitas, contacto y estadísticas.
          {clients.length > 0 && ` ${clients.length} cliente${clients.length !== 1 ? "s" : ""} registrado${clients.length !== 1 ? "s" : ""}.`}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          className="w-full rounded-lg border border-[#e8e2dc] bg-white pl-9 pr-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#c87941] focus:outline-none focus:ring-2 focus:ring-[#c87941]/15 sm:max-w-md"
          placeholder="Buscar por nombre, teléfono o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && (
        <div className="text-center text-stone-400 py-8">Cargando...</div>
      )}

      {!loading && clients.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-2xl mb-3">👥</div>
          <p className="text-stone-500 font-medium">
            {search ? `Sin resultados para "${search}"` : "Aún no hay clientes"}
          </p>
          {!search && (
            <p className="text-sm text-stone-400 mt-1">
              Los clientes aparecen aquí automáticamente cuando reservan una cita.
            </p>
          )}
        </div>
      )}

      {/* Mobile: Cards */}
      {!loading && clients.length > 0 && (
        <div className="space-y-2 md:hidden">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/admin/clients/${c.id}`}
              className="block rounded-xl border border-[#e8e2dc] bg-white p-4 hover:border-[#c87941]/40 transition shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-900 truncate">{c.name}</p>
                  <p className="text-sm text-stone-500 mt-0.5">{c.phone || "Sin teléfono"}</p>
                  {displayEmail(c.email) && (
                    <p className="text-sm text-stone-400 truncate">{c.email}</p>
                  )}
                </div>
                <div className="ml-3 text-right shrink-0">
                  <span className="inline-flex items-center rounded-full bg-[#c87941]/10 px-2.5 py-0.5 text-xs font-semibold text-[#c87941]">
                    {c.appointmentCount} cita{c.appointmentCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Desktop: Table */}
      {!loading && clients.length > 0 && (
        <div className="hidden md:block rounded-xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#e8e2dc] bg-[#faf8f6]">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">Nombre</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">Teléfono</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">Email</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400 text-right">Citas</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-[#e8e2dc] last:border-0 hover:bg-[#c87941]/5 transition">
                  <td className="px-5 py-3">
                    <Link href={`/admin/clients/${c.id}`} className="font-medium text-stone-900 hover:text-[#c87941]">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm text-stone-600">{c.phone || "—"}</td>
                  <td className="px-5 py-3 text-sm text-stone-600">{displayEmail(c.email) || "—"}</td>
                  <td className="px-5 py-3 text-sm text-stone-600 text-right">{c.appointmentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
