"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import UserAvatarBadge from "@/components/ui/UserAvatarBadge";

// ─── Icons ──────────────────────────────────────────────────────────────
function IconSave() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

// ─── Botón "Copiar → ..." con menú ──────────────────────────────────────
function CopyDayMenu({
  sourceDow,
  onCopy,
}: {
  sourceDow: number;
  onCopy: (targets: number[]) => void;
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

  const WEEKDAYS = [1, 2, 3, 4, 5].filter((d) => d !== sourceDow);
  const WEEKEND = [6, 0].filter((d) => d !== sourceDow);
  const ALL = [1, 2, 3, 4, 5, 6, 0].filter((d) => d !== sourceDow);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-[#e8e2dc] bg-white px-2 py-1 text-[10px] font-medium text-stone-500 hover:border-brand/40 hover:text-brand transition"
        title="Copiar este horario a otros días"
        aria-label="Copiar horario a otros días"
      >
        Copiar →
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 w-48 rounded-lg border border-[#e8e2dc] bg-white shadow-xl py-1 text-sm"
        >
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-brand/5 hover:text-brand transition"
            onClick={() => { onCopy(WEEKDAYS); setOpen(false); }}
          >
            Aplicar a Lun–Vie
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-brand/5 hover:text-brand transition"
            onClick={() => { onCopy(WEEKEND); setOpen(false); }}
          >
            Aplicar a Sáb + Dom
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-brand/5 hover:text-brand transition border-t border-[#f0ece8]"
            onClick={() => { onCopy(ALL); setOpen(false); }}
          >
            Aplicar a todos los días
          </button>
        </div>
      )}
    </div>
  );
}

const DAYS = [
  { dayOfWeek: 1, label: "Lunes" },
  { dayOfWeek: 2, label: "Martes" },
  { dayOfWeek: 3, label: "Miércoles" },
  { dayOfWeek: 4, label: "Jueves" },
  { dayOfWeek: 5, label: "Viernes" },
  { dayOfWeek: 6, label: "Sábado" },
  { dayOfWeek: 0, label: "Domingo" },
];

const DEFAULT_OPEN = "09:00";
const DEFAULT_CLOSE = "20:00";

type BranchHour = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
};
type Branch = {
  id: string;
  name: string;
  workingHours: BranchHour[];
};

function initBranchHours(existing: BranchHour[]): BranchHour[] {
  return DAYS.map(({ dayOfWeek }) => {
    const found = existing.find((h) => h.dayOfWeek === dayOfWeek);
    return found ?? { dayOfWeek, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE, isOpen: dayOfWeek !== 0 };
  });
}

// ─── Componente principal ───────────────────────────────────────────────
// El horario por barbero vive en /admin/barbers (tab "Horario"). Esta página
// es solo para el horario de apertura de cada sucursal.
export default function SchedulePage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [branchHours, setBranchHours] = useState<BranchHour[]>([]);
  const [savingBranch, setSavingBranch] = useState(false);
  const [branchSaved, setBranchSaved] = useState(false);
  const [branchSaveError, setBranchSaveError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadBranches = useCallback(() => {
    fetch("/api/admin/schedule")
      .then((r) => r.json())
      .then((d) => {
        const list: Branch[] = d.branches || [];
        setBranches(list);
        if (list.length > 0) {
          setSelectedBranch(list[0].id);
          setBranchHours(initBranchHours(list[0].workingHours));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  function handleSelectBranch(branchId: string) {
    setSelectedBranch(branchId);
    const branch = branches.find((b) => b.id === branchId);
    if (branch) setBranchHours(initBranchHours(branch.workingHours));
    setBranchSaved(false);
  }

  function updateBranchHour(dayOfWeek: number, field: keyof BranchHour, value: string | boolean) {
    setBranchHours((prev) =>
      prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h))
    );
    setBranchSaved(false);
  }

  function copyBranchHoursTo(sourceDow: number, targetDows: number[]) {
    const source = branchHours.find((h) => h.dayOfWeek === sourceDow);
    if (!source) return;
    setBranchHours((prev) =>
      prev.map((h) =>
        targetDows.includes(h.dayOfWeek)
          ? { ...h, openTime: source.openTime, closeTime: source.closeTime, isOpen: true }
          : h
      )
    );
    setBranchSaved(false);
  }

  const branchTimeErrors = branchHours
    .filter((h) => h.isOpen && h.openTime >= h.closeTime)
    .map((h) => DAYS.find((d) => d.dayOfWeek === h.dayOfWeek)?.label);

  async function saveBranchHours() {
    if (!selectedBranch) return;
    if (branchTimeErrors.length > 0) return;
    setSavingBranch(true);
    setBranchSaveError("");
    try {
      const r = await fetch("/api/admin/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: selectedBranch, hours: branchHours }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({ message: "No se pudo guardar el horario" }));
        setBranchSaveError(d.message || "Error al guardar");
        return;
      }
      setBranchSaved(true);
      const refreshed = await fetch("/api/admin/schedule");
      if (refreshed.ok) {
        const d = await refreshed.json();
        setBranches(d.branches || []);
      }
    } catch {
      setBranchSaveError("Error de conexión al guardar");
    } finally {
      setSavingBranch(false);
    }
  }

  const selectedBranchData = branches.find((b) => b.id === selectedBranch);
  const activeDaysCount = branchHours.filter((h) => h.isOpen).length;

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-[#e8e2dc]">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Horarios</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Configura el horario de apertura de la sucursal
          </p>
        </div>
        <div className="flex items-start gap-6 sm:gap-10 flex-wrap">
          <div className="flex items-start gap-6 sm:gap-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                Días abiertos
              </p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-0.5 tabular-nums">
                {activeDaysCount} <span className="text-stone-400 font-bold">de 7</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                Sucursales
              </p>
              <p className="text-2xl font-extrabold text-stone-900 mt-0.5 tabular-nums">
                {branches.length}
              </p>
            </div>
          </div>
          <UserAvatarBadge />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-28 rounded-lg bg-stone-100 animate-pulse" />
            ))}
          </div>
          <div className="h-96 rounded-2xl bg-stone-100 animate-pulse" />
        </div>
      ) : (
        <>
          {/* ── Branch selector ───────────────────────────────────── */}
          {branches.length > 1 && (
            <div className="flex gap-2 flex-wrap -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 overflow-x-auto">
              {branches.map((b) => {
                const active = selectedBranch === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBranch(b.id)}
                    className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-brand bg-white text-stone-900 shadow-sm"
                        : "border-[#e8e2dc] bg-white text-stone-500 hover:border-brand/40 hover:text-stone-700"
                    }`}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Info banner ──────────────────────────────────────── */}
          <div className="flex items-start gap-2 rounded-lg border border-brand/15 bg-brand/5 px-4 py-3 text-sm text-stone-700">
            <span className="text-brand mt-0.5 shrink-0">
              <IconInfo />
            </span>
            <p className="leading-snug">
              Los horarios de la sucursal definen cuándo está abierta. Los barberos sólo pueden atender dentro de estas horas.{" "}
              <Link href="/admin/barbers" className="font-semibold text-brand hover:text-brand-hover underline underline-offset-2">
                Ajusta los turnos de cada barbero aquí →
              </Link>
            </p>
          </div>

          {/* ── Branch hours card ────────────────────────────────── */}
          <div className="rounded-2xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#e8e2dc]">
              <div className="min-w-0">
                <h2 className="font-bold text-stone-900">Horario de apertura</h2>
                {selectedBranchData && (
                  <p className="text-xs text-stone-500 mt-0.5">{selectedBranchData.name}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {branchSaved && (
                  <span className="text-xs text-emerald-600 font-semibold hidden sm:inline">
                    ✓ Guardado
                  </span>
                )}
                <button
                  onClick={saveBranchHours}
                  disabled={savingBranch || branchTimeErrors.length > 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition shadow-sm shadow-brand/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IconSave />
                  {savingBranch ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>

            {/* Errores */}
            {branchTimeErrors.length > 0 && (
              <div className="mx-5 mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                Apertura debe ser anterior al cierre en: {branchTimeErrors.join(", ")}
              </div>
            )}
            {branchSaveError && (
              <div className="mx-5 mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-center justify-between gap-2">
                <span>{branchSaveError}</span>
                <button
                  onClick={saveBranchHours}
                  className="text-xs font-semibold underline hover:no-underline shrink-0"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Days list */}
            <div className="divide-y divide-[#f0ece8]">
              {DAYS.map(({ dayOfWeek, label }) => {
                const hour = branchHours.find((h) => h.dayOfWeek === dayOfWeek);
                if (!hour) return null;
                const off = !hour.isOpen;
                return (
                  <div
                    key={dayOfWeek}
                    className={`flex items-center gap-3 sm:gap-5 flex-wrap sm:flex-nowrap px-5 sm:px-6 py-4 ${
                      off ? "bg-stone-50/40" : ""
                    }`}
                  >
                    <span
                      className={`text-sm font-semibold w-20 sm:w-24 shrink-0 ${
                        off ? "text-stone-400" : "text-stone-900"
                      }`}
                    >
                      {label}
                    </span>
                    <div
                      className={`flex items-center gap-2 basis-full sm:basis-auto sm:flex-1 ${
                        off ? "opacity-40 pointer-events-none" : ""
                      }`}
                    >
                      <input
                        type="time"
                        value={hour.openTime}
                        disabled={off}
                        onChange={(e) => updateBranchHour(dayOfWeek, "openTime", e.target.value)}
                        className="input-field text-sm w-[110px] sm:w-[120px] py-1.5 font-medium tabular-nums"
                      />
                      <span className="text-stone-400 text-xs">a</span>
                      <input
                        type="time"
                        value={hour.closeTime}
                        disabled={off}
                        onChange={(e) => updateBranchHour(dayOfWeek, "closeTime", e.target.value)}
                        className="input-field text-sm w-[110px] sm:w-[120px] py-1.5 font-medium tabular-nums"
                      />
                    </div>
                    {!off && (
                      <div className="order-last sm:order-none ml-auto sm:ml-0 shrink-0">
                        <CopyDayMenu
                          sourceDow={dayOfWeek}
                          onCopy={(targets) => copyBranchHoursTo(dayOfWeek, targets)}
                        />
                      </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer shrink-0 order-2 sm:order-none ml-auto sm:ml-0">
                      <input
                        type="checkbox"
                        checked={hour.isOpen}
                        onChange={(e) => updateBranchHour(dayOfWeek, "isOpen", e.target.checked)}
                        className="h-4 w-4 rounded border-stone-300 accent-brand"
                      />
                      <span
                        className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                          hour.isOpen
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-stone-100 text-stone-400"
                        }`}
                      >
                        {hour.isOpen ? "Abierto" : "Cerrado"}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
