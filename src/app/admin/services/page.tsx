"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCLP } from "@/lib/format";
import Modal from "@/components/ui/modal";

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

  // Categorías modal state
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const [catError, setCatError] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  async function createCategory() {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    setSavingCat(true);
    setCatError("");
    try {
      const r = await fetch("/api/admin/services/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({ message: "Error al crear" }));
        setCatError(d.message || "No se pudo crear la categoría");
        return;
      }
      setNewCatName("");
      fetchServices();
    } catch {
      setCatError("Error de conexión");
    } finally {
      setSavingCat(false);
    }
  }

  async function renameCategory(id: string) {
    const trimmed = editingCatName.trim();
    if (!trimmed) return;
    try {
      const r = await fetch(`/api/admin/services/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (r.ok) {
        setEditingCatId(null);
        setEditingCatName("");
        fetchServices();
      }
    } catch {
      // toast silent — ya hay catError si falla; para rename mostramos en la celda
    }
  }

  async function deleteCategory(id: string) {
    if (!window.confirm("¿Eliminar esta categoría? Los servicios asociados quedarán sin categoría.")) return;
    try {
      const r = await fetch(`/api/admin/services/categories/${id}`, { method: "DELETE" });
      if (r.ok) fetchServices();
    } catch {
      // noop
    }
  }

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

  // Intercambia el orden de un servicio con su vecino (up/down). Usa el campo
  // `order` de la DB: swap entre el servicio actual y el anterior/siguiente.
  async function moveService(svc: ServiceRow, direction: "up" | "down") {
    const idx = services.findIndex((s) => s.id === svc.id);
    const neighborIdx = direction === "up" ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= services.length) return;
    const neighbor = services[neighborIdx];
    // Swap ordenes: optimista en UI primero, luego persiste
    setServices((prev) => {
      const copy = [...prev];
      copy[idx] = { ...svc, order: neighbor.order };
      copy[neighborIdx] = { ...neighbor, order: svc.order };
      // re-sort by order asc
      return copy.sort((a, b) => a.order - b.order);
    });
    try {
      await Promise.all([
        fetch(`/api/admin/services/${svc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: neighbor.order }),
        }),
        fetch(`/api/admin/services/${neighbor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: svc.order }),
        }),
      ]);
    } catch {
      // si falla, refrescamos para volver al estado real
      fetchServices();
    }
  }

  // Crea un nuevo servicio con los mismos campos (nombre + " (copia)")
  async function duplicateService(svc: ServiceRow) {
    const body = {
      name: `${svc.name} (copia)`,
      description: svc.description || undefined,
      durationMin: svc.durationMin,
      price: svc.price,
      categoryId: svc.categoryId || undefined,
    };
    const r = await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return;
    setLoading(true);
    fetchServices();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">Servicios</h1>
          <p className="text-sm text-stone-500">
            Define los servicios que ofreces, su duración y precio.
            {services.length > 0 && ` ${services.filter((s) => s.active).length} activo${services.filter((s) => s.active).length !== 1 ? "s" : ""} de ${services.length}.`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button onClick={() => setShowCategoriesModal(true)} className="btn-secondary text-sm">
            Categorías
          </button>
          <button onClick={openNew} className="btn-primary text-sm">
            + Nuevo servicio
          </button>
        </div>
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
              className={`rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
                svc.active ? "border-[#e8e2dc]" : "border-red-100 opacity-50"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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

                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 flex-wrap">
                  {/* Up/Down reorder */}
                  <button
                    type="button"
                    onClick={() => moveService(svc, "up")}
                    disabled={services.indexOf(svc) === 0}
                    className="rounded-md p-1.5 text-stone-400 hover:text-brand hover:bg-brand/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Subir"
                    aria-label="Subir servicio"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 10l4-4 4 4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveService(svc, "down")}
                    disabled={services.indexOf(svc) === services.length - 1}
                    className="rounded-md p-1.5 text-stone-400 hover:text-brand hover:bg-brand/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Bajar"
                    aria-label="Bajar servicio"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => duplicateService(svc)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 hover:text-brand hover:bg-brand/5 transition"
                    title="Duplicar"
                  >
                    Duplicar
                  </button>
                  <button
                    onClick={() => openEdit(svc)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/10 transition"
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

      {/* Modal de gestión de categorías */}
      <Modal
        open={showCategoriesModal}
        title="Gestionar categorías"
        onClose={() => { setShowCategoriesModal(false); setCatError(""); setEditingCatId(null); }}
      >
        <div className="space-y-4">
          <p className="text-xs text-stone-500">
            Agrupa tus servicios por categoría (ej: &quot;Corte&quot;, &quot;Barba&quot;, &quot;Coloración&quot;) para que aparezcan organizados en el booking.
          </p>

          {/* Nueva categoría */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="input-field flex-1"
              value={newCatName}
              onChange={(e) => { setNewCatName(e.target.value); setCatError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") createCategory(); }}
              placeholder="Nombre de la categoría"
              maxLength={80}
            />
            <button
              onClick={createCategory}
              disabled={savingCat || !newCatName.trim()}
              className="btn-primary text-sm shrink-0"
            >
              {savingCat ? "Creando..." : "Agregar"}
            </button>
          </div>
          {catError && <p className="text-xs text-red-600">{catError}</p>}

          {/* Lista */}
          {categories.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">Aún no hay categorías</p>
          ) : (
            <div className="divide-y divide-[#f0ece8] border border-[#e8e2dc] rounded-lg">
              {categories.map((c) => {
                const inUse = services.filter((s) => s.categoryId === c.id).length;
                return (
                  <div key={c.id} className="flex items-center gap-2 p-3">
                    {editingCatId === c.id ? (
                      <>
                        <input
                          className="input-field text-sm flex-1"
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameCategory(c.id);
                            if (e.key === "Escape") setEditingCatId(null);
                          }}
                          autoFocus
                          maxLength={80}
                        />
                        <button onClick={() => renameCategory(c.id)} className="text-xs font-semibold text-brand hover:text-brand-hover">Guardar</button>
                        <button onClick={() => setEditingCatId(null)} className="text-xs text-stone-400 hover:text-stone-600">Cancelar</button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate">{c.name}</p>
                          <p className="text-[10px] text-stone-400">{inUse} servicio{inUse !== 1 ? "s" : ""}</p>
                        </div>
                        <button
                          onClick={() => { setEditingCatId(c.id); setEditingCatName(c.name); }}
                          className="text-xs font-medium text-stone-500 hover:text-brand px-2 py-1"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteCategory(c.id)}
                          className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
