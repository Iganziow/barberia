"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCLP } from "@/lib/format";

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
  active: boolean;
  order: number;
  categoryId: string | null;
  categoryName: string | null;
};

type Category = { id: string; name: string };

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [price, setPrice] = useState(0);
  const [categoryId, setCategoryId] = useState("");

  const fetchServices = useCallback(() => {
    fetch("/api/admin/services?all=true")
      .then((r) => r.json())
      .then((d) => {
        setServices(d.services || []);
        setCategories(d.categories || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  function resetForm() {
    setName("");
    setDescription("");
    setDurationMin(30);
    setPrice(0);
    setCategoryId("");
    setEditId(null);
    setShowForm(false);
  }

  function openNew() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(svc: ServiceRow) {
    setEditId(svc.id);
    setName(svc.name);
    setDescription(svc.description || "");
    setDurationMin(svc.durationMin);
    setPrice(svc.price);
    setCategoryId(svc.categoryId || "");
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim() || durationMin < 5 || price < 0) return;
    setSaving(true);

    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      durationMin,
      price,
      categoryId: categoryId || undefined,
    };

    if (editId) {
      await fetch(`/api/admin/services/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setSaving(false);
    resetForm();
    setLoading(true);
    fetchServices();
  }

  async function toggleActive(svc: ServiceRow) {
    if (svc.active && !window.confirm(`¿Desactivar "${svc.name}"? No aparecerá en el booking público.`)) {
      return;
    }
    await fetch(`/api/admin/services/${svc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !svc.active }),
    });
    setLoading(true);
    fetchServices();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">Servicios</h1>
          <p className="text-sm text-stone-500">
            Define los servicios que ofreces, su duración y precio.
            {services.length > 0 && ` ${services.filter((s) => s.active).length} activo${services.filter((s) => s.active).length !== 1 ? "s" : ""} de ${services.length}.`}
          </p>
        </div>
        <button onClick={openNew} className="btn-primary text-sm">
          + Nuevo servicio
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-[#e8e2dc] bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-stone-900">
            {editId ? "Editar servicio" : "Nuevo servicio"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="field-label">Nombre</label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Corte Clásico"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label">Descripción (opcional)</label>
              <textarea
                className="input-field"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción del servicio..."
              />
            </div>

            <div>
              <label className="field-label">Duración (minutos)</label>
              <input
                type="number"
                className="input-field"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                min={5}
                step={5}
              />
            </div>

            <div>
              <label className="field-label">Precio (CLP)</label>
              <input
                type="number"
                className="input-field"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                min={0}
                step={500}
              />
            </div>

            {categories.length > 0 && (
              <div>
                <label className="field-label">Categoría</label>
                <select
                  className="input-field"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={resetForm} className="btn-secondary text-sm">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || durationMin < 5}
              className="btn-primary text-sm"
            >
              {saving ? "Guardando..." : editId ? "Guardar cambios" : "Crear servicio"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-[#e8e2dc] bg-white p-4 animate-pulse">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-stone-100 rounded w-40" />
                  <div className="h-3 bg-stone-100 rounded w-24" />
                </div>
                <div className="h-7 w-20 bg-stone-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && services.length === 0 && (
        <div className="rounded-2xl border border-[#e8e2dc] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-stone-50">
            <svg width="32" height="32" fill="none" stroke="#c87941" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
              <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
            </svg>
          </div>
          <p className="text-lg font-bold text-stone-800">Crea tu primer servicio</p>
          <p className="text-sm text-stone-400 mt-1 mb-5 max-w-xs mx-auto">
            Define los cortes, barba y otros servicios con su precio y duración.
          </p>
          <button onClick={openNew} className="btn-primary">
            + Nuevo servicio
          </button>
        </div>
      )}

      {!loading && services.length > 0 && (
        <div className="space-y-2">
          {services.map((svc) => (
            <div
              key={svc.id}
              className={`rounded-xl border bg-white p-4 shadow-sm transition ${
                svc.active ? "border-[#e8e2dc]" : "border-red-100 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-stone-900">{svc.name}</h3>
                    {!svc.active && (
                      <span className="text-[10px] font-semibold uppercase rounded-full bg-red-50 text-red-500 px-2 py-0.5">
                        Desactivado
                      </span>
                    )}
                    {svc.categoryName && (
                      <span className="text-[10px] font-medium rounded-full bg-stone-100 text-stone-500 px-2 py-0.5">
                        {svc.categoryName}
                      </span>
                    )}
                  </div>
                  {svc.description && (
                    <p className="text-sm text-stone-500 mt-0.5">{svc.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-xs text-stone-500">
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                      {svc.durationMin} min
                    </span>
                    <span className="text-sm font-bold text-stone-800">{formatCLP(svc.price)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(svc)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#c87941] hover:bg-[#c87941]/10 transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggleActive(svc)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      svc.active
                        ? "text-red-600 hover:bg-red-50"
                        : "text-green-600 hover:bg-green-50"
                    }`}
                  >
                    {svc.active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
