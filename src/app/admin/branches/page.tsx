"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import UserAvatarBadge from "@/components/ui/UserAvatarBadge";

type BranchRow = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  barberCount: number;
  monthAppointments: number;
};

// ─── Iconos inline (hand-rolled, 1.8 stroke, currentColor) ───────────────
function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
    </svg>
  );
}
function IconPin({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}
function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// ─── Componente ──────────────────────────────────────────────────────────
export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Form
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const [fetchError, setFetchError] = useState("");

  const fetchBranches = useCallback(() => {
    setFetchError("");
    fetch("/api/admin/branches")
      .then(async (r) => {
        if (!r.ok) throw new Error("No se pudo cargar la lista");
        return r.json();
      })
      .then((d) => setBranches(d.branches || []))
      .catch(() => setFetchError("No se pudieron cargar las sucursales. Revisa tu conexión."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  function resetForm() {
    setName("");
    setAddress("");
    setPhone("");
    setEditId(null);
    setShowForm(false);
    setError("");
  }

  function openNew() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(b: BranchRow) {
    setEditId(b.id);
    setName(b.name);
    setAddress(b.address || "");
    setPhone(b.phone || "");
    setShowForm(true);
    setError("");
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");

    const body = {
      name: name.trim(),
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
    };

    try {
      const url = editId
        ? `/api/admin/branches/${editId}`
        : "/api/admin/branches";
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error" }));
        setError(err.message || "Error al guardar");
        return;
      }

      resetForm();
      fetchBranches();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  // Estado del modal de confirmación de borrado.
  const [confirmDelete, setConfirmDelete] = useState<BranchRow | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete(id: string) {
    setDeleting(id);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/branches/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error" }));
        setDeleteError(err.message || "No se pudo eliminar");
        return;
      }
      setConfirmDelete(null);
      fetchBranches();
    } catch {
      setDeleteError("Error de conexión");
    } finally {
      setDeleting(null);
    }
  }

  // Stats globales para los chips del header
  const totals = useMemo(
    () => ({
      branches: branches.length,
      barbers: branches.reduce((s, b) => s + b.barberCount, 0),
      appointments: branches.reduce((s, b) => s + b.monthAppointments, 0),
    }),
    [branches]
  );

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-[#e8e2dc]">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
            Sucursales
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Gestiona las sedes de tu negocio: dirección, contacto y equipo
          </p>
        </div>
        <div className="flex items-start gap-4 sm:gap-8 flex-wrap">
          {/* Stats inline (consistente con el resto del admin) */}
          {!loading && branches.length > 0 && (
            <div className="flex items-start gap-6 sm:gap-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                  Sucursales
                </p>
                <p className="text-2xl font-extrabold text-stone-900 mt-0.5 tabular-nums">
                  {totals.branches}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                  Barberos
                </p>
                <p className="text-2xl font-extrabold text-brand mt-0.5 tabular-nums">
                  {totals.barbers}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                  Citas mes
                </p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-0.5 tabular-nums">
                  {totals.appointments}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            {!showForm && (
              <button
                onClick={openNew}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition shadow-sm shadow-brand/20 shrink-0"
              >
                <IconPlus className="h-3.5 w-3.5" />
                Nueva sucursal
              </button>
            )}
            <UserAvatarBadge />
          </div>
        </div>
      </div>

      {/* ── Formulario inline ──────────────────────────────────────────── */}
      {showForm && (
        <div className="rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/[0.03] to-transparent p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand shrink-0">
              <IconBuilding />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                {editId ? "Editar sucursal" : "Nueva sucursal"}
              </h2>
              <p className="text-xs text-stone-500">
                {editId ? "Actualiza los datos de contacto y ubicación." : "Cada sucursal puede tener sus propios barberos y horarios."}
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label">Nombre *</label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Sede Centro"
                autoFocus
              />
            </div>
            <div>
              <label className="field-label">Dirección</label>
              <input
                className="input-field"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Av. Providencia 1234, Santiago"
              />
            </div>
            <div>
              <label className="field-label">Teléfono</label>
              <input
                className="input-field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: +56 9 1234 5678"
              />
            </div>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
          <div className="flex gap-2 pt-4 mt-1">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {saving
                ? "Guardando..."
                : editId
                  ? "Guardar cambios"
                  : "Crear sucursal"}
            </button>
            <button onClick={resetForm} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Error global ───────────────────────────────────────────────── */}
      {fetchError && !loading && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{fetchError}</span>
          <button onClick={fetchBranches} className="text-xs font-semibold underline hover:no-underline">Reintentar</button>
        </div>
      )}

      {/* ── Lista ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-40 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-50 animate-pulse"
            />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e8e2dc] bg-white p-12 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 text-brand">
            <IconBuilding className="h-8 w-8" />
          </div>
          <p className="text-base font-bold text-stone-800">
            Aún no tienes sucursales
          </p>
          <p className="text-sm text-stone-500 mt-1 mb-5 max-w-sm mx-auto">
            Crea tu primera sucursal para empezar a recibir reservas. Puedes agregar más cuando quieras.
          </p>
          <button
            onClick={openNew}
            className="btn-primary text-sm inline-flex items-center gap-1.5"
          >
            <IconPlus className="h-3.5 w-3.5" />
            Crear primera sucursal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div
              key={b.id}
              className="group relative rounded-2xl border border-[#e8e2dc] bg-white p-5 shadow-sm hover:shadow-lg hover:border-brand/30 transition-all flex flex-col"
            >
              {/* Borde izquierdo de acento */}
              <div className="absolute top-5 bottom-5 left-0 w-1 rounded-r bg-brand/0 group-hover:bg-brand/60 transition" aria-hidden />

              {/* Header del card */}
              <div className="flex items-start gap-3 mb-4">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand shrink-0">
                  <IconBuilding />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-stone-900 truncate">{b.name}</h3>
                  <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Activa
                  </span>
                </div>
              </div>

              {/* Datos de contacto */}
              <div className="space-y-2 text-sm flex-1 min-h-[64px]">
                {b.address ? (
                  <div className="flex items-start gap-2 text-stone-600">
                    <IconPin className="mt-0.5 text-stone-400 shrink-0" />
                    <span className="leading-snug">{b.address}</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-stone-300">
                    <IconPin className="mt-0.5 shrink-0" />
                    <span className="italic leading-snug">Sin dirección registrada</span>
                  </div>
                )}
                {b.phone ? (
                  <div className="flex items-start gap-2 text-stone-600">
                    <IconPhone className="mt-0.5 text-stone-400 shrink-0" />
                    <span className="tabular-nums">{b.phone}</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-stone-300">
                    <IconPhone className="mt-0.5 shrink-0" />
                    <span className="italic">Sin teléfono</span>
                  </div>
                )}
              </div>

              {/* Stats footer */}
              <div className="mt-4 pt-4 border-t border-[#f0ece8] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-stone-500 min-w-0">
                  <span className="inline-flex items-center gap-1">
                    <IconUsers className="h-3 w-3 text-stone-400" />
                    <span className="font-semibold text-stone-700 tabular-nums">{b.barberCount}</span>
                    <span className="hidden sm:inline">{b.barberCount === 1 ? "barbero" : "barberos"}</span>
                  </span>
                  <span className="text-stone-300">·</span>
                  <span className="inline-flex items-center gap-1">
                    <IconCalendar className="h-3 w-3 text-stone-400" />
                    <span className="font-semibold text-stone-700 tabular-nums">{b.monthAppointments}</span>
                    <span className="hidden sm:inline">citas/mes</span>
                  </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => openEdit(b)}
                    className="rounded-md px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100 hover:text-brand transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => { setConfirmDelete(b); setDeleteError(""); }}
                    disabled={deleting === b.id}
                    className="rounded-md px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-700 transition disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmación de borrado */}
      <ConfirmDialog
        open={confirmDelete !== null}
        title="¿Eliminar sucursal?"
        message={confirmDelete ? `Vas a eliminar "${confirmDelete.name}". Esta acción no se puede deshacer.${deleteError ? `\n\nError: ${deleteError}` : ""}` : ""}
        confirmLabel="Eliminar sucursal"
        variant="danger"
        loading={deleting !== null}
        onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete.id); }}
        onClose={() => { setConfirmDelete(null); setDeleteError(""); }}
      />
    </div>
  );
}
