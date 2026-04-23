"use client";

import { useCallback, useEffect, useState } from "react";

type BranchRow = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
};

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

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta sucursal? Esta acción no se puede deshacer."))
      return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/branches/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error" }));
        alert(err.message || "No se pudo eliminar");
        return;
      }
      fetchBranches();
    } catch {
      alert("Error de conexión");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">
            Sucursales
          </h1>
          <p className="text-sm text-stone-500">
            Gestiona las sedes de tu negocio
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openNew}
            className="self-start sm:self-auto rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition shadow-sm"
          >
            + Nueva sucursal
          </button>
        )}
      </div>

      {/* Formulario inline */}
      {showForm && (
        <div className="rounded-xl border border-[#e8e2dc] bg-white p-5 space-y-4">
          <h2 className="text-base font-bold text-stone-900">
            {editId ? "Editar sucursal" : "Nueva sucursal"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label">Nombre *</label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Sede Centro"
              />
            </div>
            <div>
              <label className="field-label">Dirección</label>
              <input
                className="input-field"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Av. Principal 123"
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
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex gap-2 pt-1">
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

      {fetchError && !loading && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{fetchError}</span>
          <button onClick={fetchBranches} className="text-xs font-semibold underline hover:no-underline">Reintentar</button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-stone-100 animate-pulse"
            />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#e8e2dc] bg-white p-10 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brand/10">
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="#c87941"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
            </svg>
          </div>
          <p className="text-sm font-bold text-stone-800">
            Sin sucursales
          </p>
          <p className="text-xs text-stone-400 mt-1 mb-4">
            Crea tu primera sucursal para empezar
          </p>
          <button
            onClick={openNew}
            className="btn-primary text-sm"
          >
            + Nueva sucursal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((b) => (
            <div
              key={b.id}
              className="group rounded-xl border border-[#e8e2dc] bg-white p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:shadow-sm transition"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-900">
                  {b.name}
                </p>
                <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1 text-xs text-stone-500">
                  {b.address && (
                    <span className="inline-flex items-center gap-1">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="text-stone-400"
                      >
                        <path d="M10 2a6 6 0 00-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 00-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                      {b.address}
                    </span>
                  )}
                  {b.phone && (
                    <span className="inline-flex items-center gap-1">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="text-stone-400"
                      >
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                      {b.phone}
                    </span>
                  )}
                  {!b.address && !b.phone && (
                    <span className="text-stone-400 italic">
                      Sin dirección ni teléfono
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition">
                <button
                  onClick={() => openEdit(b)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  disabled={deleting === b.id}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                >
                  {deleting === b.id ? "..." : "Eliminar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
