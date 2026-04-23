"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatCLP } from "@/lib/format";
import Modal from "@/components/ui/modal";
import UserAvatarBadge from "@/components/ui/UserAvatarBadge";

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

// ─── Icons ──────────────────────────────────────────────────────────────
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconPencil() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6M10 11v6M14 11v6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}
function IconDots() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

// ─── Menú overflow por row (duplicar, reordenar, activar/desactivar) ────
function RowActionsMenu({
  svc,
  isFirst,
  isLast,
  onDuplicate,
  onMove,
  onToggleActive,
}: {
  svc: ServiceRow;
  isFirst: boolean;
  isLast: boolean;
  onDuplicate: () => void;
  onMove: (dir: "up" | "down") => void;
  onToggleActive: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid place-items-center h-7 w-7 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
        aria-label="Más acciones"
        title="Más acciones"
      >
        <IconDots />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 w-44 rounded-lg border border-[#e8e2dc] bg-white shadow-xl py-1 text-sm"
        >
          <button
            type="button"
            onClick={() => { onDuplicate(); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 transition"
          >
            Duplicar
          </button>
          <button
            type="button"
            disabled={isFirst}
            onClick={() => { onMove("up"); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Subir
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={() => { onMove("down"); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Bajar
          </button>
          <button
            type="button"
            onClick={() => { onToggleActive(); setOpen(false); }}
            className={`w-full text-left px-3 py-1.5 text-xs transition border-t border-[#f0ece8] ${
              svc.active
                ? "text-red-600 hover:bg-red-50"
                : "text-emerald-600 hover:bg-emerald-50"
            }`}
          >
            {svc.active ? "Pausar servicio" : "Reactivar servicio"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────
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

  // ─── Data fetching ──────────────────────────────────────────────────
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

  // ─── Category CRUD ──────────────────────────────────────────────────
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
      // silent
    }
  }

  async function deleteCategory(id: string) {
    if (!window.confirm("¿Eliminar esta categoría? Los servicios asociados quedarán sin categoría.")) return;
    try {
      const r = await fetch(`/api/admin/services/categories/${id}`, { method: "DELETE" });
      if (r.ok) fetchServices();
    } catch {
      // silent
    }
  }

  // ─── Service CRUD ───────────────────────────────────────────────────
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
    if (svc.active && !window.confirm(`¿Pausar "${svc.name}"? No aparecerá en el booking público hasta que lo reactives.`)) {
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

  async function deleteService(svc: ServiceRow) {
    if (!window.confirm(`¿Eliminar "${svc.name}"? Esta acción lo ocultará del booking y no se puede deshacer fácilmente.`)) return;
    // En el service layer "delete" soft-deletes (active = false), lo que
    // efectivamente pausa el servicio. Usamos la misma API para consistencia.
    await fetch(`/api/admin/services/${svc.id}`, { method: "DELETE" });
    setLoading(true);
    fetchServices();
  }

  async function moveService(svc: ServiceRow, direction: "up" | "down") {
    const idx = services.findIndex((s) => s.id === svc.id);
    const neighborIdx = direction === "up" ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= services.length) return;
    const neighbor = services[neighborIdx];
    setServices((prev) => {
      const copy = [...prev];
      copy[idx] = { ...svc, order: neighbor.order };
      copy[neighborIdx] = { ...neighbor, order: svc.order };
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
      fetchServices();
    }
  }

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

  const activeCount = services.filter((s) => s.active).length;

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-[#e8e2dc]">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Servicios</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Catálogo de la barbería
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowCategoriesModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e2dc] bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:border-brand/40 hover:text-brand transition"
          >
            Categorías
            {categories.length > 0 && (
              <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-stone-100 px-1 text-[10px] font-bold text-stone-500 tabular-nums">
                {categories.length}
              </span>
            )}
          </button>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition shadow-sm shadow-brand/20"
          >
            <IconPlus />
            Nuevo servicio
          </button>
          <UserAvatarBadge />
        </div>
      </div>

      {/* ── Formulario inline (crear / editar) ───────────────────── */}
      {showForm && (
        <div className="rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/[0.03] to-transparent p-5 sm:p-6 shadow-sm space-y-4">
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
                autoFocus
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
              <div className="sm:col-span-2">
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
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || durationMin < 5}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {saving ? "Guardando..." : editId ? "Guardar cambios" : "Crear servicio"}
            </button>
            <button onClick={resetForm} className="btn-secondary text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────── */}
      {loading && (
        <div className="rounded-2xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-[#f0ece8]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-stone-50/60 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────── */}
      {!loading && services.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-[#e8e2dc] bg-white p-12 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 text-brand">
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
            </svg>
          </div>
          <p className="text-base font-bold text-stone-800">
            Aún no tienes servicios
          </p>
          <p className="text-sm text-stone-500 mt-1 mb-5 max-w-sm mx-auto">
            Define los cortes, barba y otros servicios con su precio y duración. Cada barbero puede luego elegir cuáles ofrece.
          </p>
          <button
            onClick={openNew}
            className="btn-primary text-sm inline-flex items-center gap-1.5"
          >
            <IconPlus />
            Crear primer servicio
          </button>
        </div>
      )}

      {/* ── Services table ───────────────────────────────────────── */}
      {!loading && services.length > 0 && (
        <>
          <div className="rounded-2xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
            {/* Desktop table header (hidden en mobile) */}
            <div className="hidden md:grid grid-cols-[1fr_120px_140px_120px] gap-4 px-6 py-3 bg-stone-50/50 border-b border-[#e8e2dc]">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Nombre</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Duración</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Precio</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 text-right">Acciones</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-[#f0ece8]">
              {services.map((svc, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === services.length - 1;
                return (
                  <div
                    key={svc.id}
                    className={`grid grid-cols-1 md:grid-cols-[1fr_120px_140px_120px] gap-2 md:gap-4 px-5 md:px-6 py-3.5 items-center transition ${
                      svc.active ? "hover:bg-stone-50/60" : "bg-stone-50/30 opacity-70"
                    }`}
                  >
                    {/* Name + badges */}
                    <div className="min-w-0 flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-stone-900 truncate">{svc.name}</p>
                      {svc.categoryName && (
                        <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-600">
                          {svc.categoryName}
                        </span>
                      )}
                      {!svc.active && (
                        <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                          Pausado
                        </span>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="text-sm text-stone-600 tabular-nums flex items-center gap-1.5">
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="text-stone-400 md:hidden">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      <span className="md:inline">
                        <span className="md:hidden text-stone-400 mr-1">Duración:</span>
                        {svc.durationMin} min
                      </span>
                    </div>

                    {/* Price */}
                    <div className="font-bold text-brand tabular-nums">
                      <span className="md:hidden text-stone-400 font-normal mr-1">Precio:</span>
                      {formatCLP(svc.price)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 md:justify-end">
                      <button
                        type="button"
                        onClick={() => openEdit(svc)}
                        className="grid place-items-center h-7 w-7 rounded-md text-stone-400 hover:text-brand hover:bg-brand/10 transition"
                        title="Editar"
                        aria-label="Editar servicio"
                      >
                        <IconPencil />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteService(svc)}
                        className="grid place-items-center h-7 w-7 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Eliminar"
                        aria-label="Eliminar servicio"
                      >
                        <IconTrash />
                      </button>
                      <RowActionsMenu
                        svc={svc}
                        isFirst={isFirst}
                        isLast={isLast}
                        onDuplicate={() => duplicateService(svc)}
                        onMove={(dir) => moveService(svc, dir)}
                        onToggleActive={() => toggleActive(svc)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer count */}
          <p className="text-xs text-stone-400 tabular-nums">
            {activeCount} {activeCount === 1 ? "activo" : "activos"} de {services.length} servicio{services.length !== 1 ? "s" : ""}
          </p>
        </>
      )}

      {/* ── Modal de categorías ──────────────────────────────────── */}
      <Modal
        open={showCategoriesModal}
        title="Gestionar categorías"
        onClose={() => {
          setShowCategoriesModal(false);
          setCatError("");
          setEditingCatId(null);
        }}
      >
        <div className="space-y-4">
          <p className="text-xs text-stone-500">
            Agrupa tus servicios por categoría (ej: &quot;Corte&quot;, &quot;Barba&quot;, &quot;Coloración&quot;) para que aparezcan organizados en el booking.
          </p>

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
