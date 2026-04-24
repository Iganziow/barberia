"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCLP, formatTime } from "@/lib/format";
import { STATUS_CONFIG } from "@/lib/constants";

type ClientDetail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  loyaltyPoints: number;
  createdAt: string;
  stats: {
    totalVisits: number;
    totalSpent: number;
    lastVisitDate: string | null;
  };
  appointments: Array<{
    id: string;
    start: string;
    end: string;
    status: string;
    serviceName: string;
    barberName: string;
    price: number;
    payment: { amount: number; tip: number; method: string } | null;
    noteInternal: string | null;
  }>;
};

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])
);
const STATUS_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, `${v.bg} ${v.text}`])
);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setLoadError("");
    fetch(`/api/admin/clients/${id}`)
      .then(async (r) => {
        if (r.status === 404) return { notFound: true };
        if (!r.ok) throw new Error("No se pudo cargar el cliente");
        return r.json();
      })
      .then((data) => {
        if (data?.client) setClient(data.client);
      })
      .catch((e: Error) => setLoadError(e.message || "Error de conexión"))
      .finally(() => setLoading(false));
  }, [id]);

  function startEdit() {
    if (!client) return;
    setForm({
      name: client.name,
      email: client.email && !client.email.includes("@noemail") ? client.email : "",
      phone: client.phone || "",
      notes: client.notes || "",
    });
    setError("");
    setEditing(true);
  }

  async function saveEdit() {
    if (!client || !form.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error" }));
        setError(err.message || "No se pudo actualizar");
        return;
      }
      const data = await res.json();
      setClient((prev) =>
        prev
          ? {
              ...prev,
              name: data.client.name,
              email: data.client.email,
              phone: data.client.phone,
              notes: data.client.notes,
            }
          : null
      );
      setEditing(false);
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Cargando...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-20 space-y-3">
        {loadError ? (
          <>
            <p className="text-sm font-medium text-red-600">{loadError}</p>
            <button onClick={() => { setLoading(true); setLoadError(""); fetch(`/api/admin/clients/${id}`).then(async r => { if (!r.ok) throw new Error("Error"); return r.json(); }).then(d => { if (d?.client) setClient(d.client); }).catch((e: Error) => setLoadError(e.message)).finally(() => setLoading(false)); }} className="text-xs font-semibold text-brand underline">Reintentar</button>
          </>
        ) : (
          <p className="text-stone-500">Cliente no encontrado</p>
        )}
        <Link href="/admin/clients" className="text-brand hover:text-brand-hover text-sm mt-2 inline-block">
          ← Volver a clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link
            href="/admin/clients"
            className="text-sm text-brand hover:text-brand-hover mb-2 inline-block"
          >
            &larr; Clientes
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
            {client.name}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-stone-500">
            {client.phone && <span>{client.phone}</span>}
            {client.email &&
              !client.email.includes("@placeholder") &&
              !client.email.includes("@noemail") && (
                <span>{client.email}</span>
              )}
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="rounded-lg border border-[#e8e2dc] bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-brand/40 hover:text-brand transition"
          >
            Editar datos
          </button>
        )}
      </div>

      {/* Edit form (inline) */}
      {editing && (
        <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5 space-y-3">
          <h2 className="text-sm font-bold text-stone-900">Editar cliente</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label">Nombre *</label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label className="field-label">Teléfono</label>
              <input
                className="input-field"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+56 9 1234 5678"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Email</label>
              <input
                type="email"
                className="input-field"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="cliente@email.com"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Notas internas</label>
              <textarea
                className="input-field min-h-[80px] resize-y"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Preferencias, alergias, notas del equipo…"
              />
              <p className="text-[10px] text-stone-400 mt-1">
                Las notas son solo visibles para el equipo interno, no para el cliente.
              </p>
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving || !form.name.trim()}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn-secondary text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Notas internas (solo lectura cuando no está editando) */}
      {!editing && client.notes && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-1">
            Nota interna
          </p>
          <p className="text-sm text-stone-700 whitespace-pre-wrap">
            {client.notes}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Total visitas
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {client.stats.totalVisits}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Total gastado
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatCLP(client.stats.totalSpent)}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Última visita
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {client.stats.lastVisitDate
              ? formatDate(client.stats.lastVisitDate)
              : "Sin visitas"}
          </p>
        </div>
      </div>

      {/* ── Historial de notas internas (timeline) ──
          Muestra solo las citas que tienen noteInternal. Sirve para que
          el barbero/admin revise "¿qué corte pidió la vez pasada?"
          antes de atenderlo de nuevo. */}
      {(() => {
        const notesHistory = client.appointments.filter((a) => a.noteInternal && a.noteInternal.trim());
        if (notesHistory.length === 0) return null;
        return (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 shadow-sm overflow-hidden">
            <div className="border-b border-amber-200/60 px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-amber-600">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
                <div>
                  <h2 className="text-sm font-bold text-stone-900">Notas del historial</h2>
                  <p className="text-xs text-stone-500">
                    Preferencias y observaciones registradas en citas anteriores
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                {notesHistory.length} {notesHistory.length === 1 ? "nota" : "notas"}
              </span>
            </div>
            <ol className="divide-y divide-amber-200/40">
              {notesHistory.map((apt) => (
                <li key={apt.id} className="px-5 py-4 flex gap-4">
                  {/* Timeline dot */}
                  <div className="relative shrink-0 pt-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500 border-2 border-amber-200 shadow-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap mb-1">
                      <span className="text-xs font-semibold text-stone-900 capitalize">
                        {formatDate(apt.start)}
                      </span>
                      <span className="text-stone-300">·</span>
                      <span className="text-xs text-stone-600">{apt.serviceName}</span>
                      <span className="text-stone-300">·</span>
                      <span className="text-xs text-stone-500">con {apt.barberName}</span>
                      <span className={`ml-auto inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLORS[apt.status] || "bg-gray-100"}`}>
                        {STATUS_LABELS[apt.status] || apt.status}
                      </span>
                    </div>
                    <p className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">
                      {apt.noteInternal}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        );
      })()}

      {/* Appointment history */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Historial de citas
          </h2>
          <p className="text-xs text-gray-500">
            {client.appointments.length} cita
            {client.appointments.length !== 1 ? "s" : ""}
          </p>
        </div>

        {client.appointments.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400">
            Sin citas registradas
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Fecha
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Servicio
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Profesional
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Estado
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">
                  Precio
                </th>
              </tr>
            </thead>
            <tbody>
              {client.appointments.map((apt) => (
                <tr
                  key={apt.id}
                  className="border-b last:border-0 hover:bg-gray-50/50"
                >
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(apt.start)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(apt.start)} - {formatTime(apt.end)}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <span>{apt.serviceName}</span>
                      {apt.noteInternal && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-semibold"
                          title={apt.noteInternal}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                          </svg>
                          nota
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">
                    {apt.barberName}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[apt.status] || "bg-gray-100"}`}
                    >
                      {STATUS_LABELS[apt.status] || apt.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700 text-right">
                    {formatCLP(apt.price)}
                    {apt.payment && (
                      <div className="text-xs text-green-600">Pagado</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Client info */}
      <div className="rounded-2xl border bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Información
        </p>
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            Cliente desde{" "}
            <span className="font-medium text-gray-900">
              {formatDate(client.createdAt)}
            </span>
          </p>
          {client.notes && (
            <p>
              Notas:{" "}
              <span className="font-medium text-gray-900">{client.notes}</span>
            </p>
          )}
          <p>
            Puntos de fidelización:{" "}
            <span className="font-medium text-gray-900">
              {client.loyaltyPoints}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
