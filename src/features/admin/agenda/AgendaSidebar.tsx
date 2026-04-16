"use client";

import { useState } from "react";
import type {
  AppointmentStatusCode,
  BarberOption,
  BranchOption,
  StatusPreset,
  VisibleRange,
} from "@/types/agenda";
import AgendaBarberSelect from "./AgendaBarberSelect";
import AgendaStatusFilter from "./AgendaStatusFilter";
import AgendaVisibleRangeSelect from "./AgendaVisibleRangeSelect";

/**
 * Sidebar izquierda de la agenda, inspirada en Agenda Pro.
 * Responsivo: en mobile aparece como drawer desde la izquierda (controlado por `mobileOpen`).
 */
export default function AgendaSidebar({
  branches,
  branchId,
  onChangeBranch,

  barbers,
  barberIds,
  onChangeBarberIds,

  statusPreset,
  customStatuses,
  onChangeStatusPreset,
  onChangeCustomStatuses,

  visibleRange,
  onChangeVisibleRange,

  onOpenQuickSearch,

  mobileOpen,
  onMobileClose,
}: {
  branches: BranchOption[];
  branchId: string;
  onChangeBranch: (id: string) => void;

  barbers: BarberOption[];
  barberIds: string[];
  onChangeBarberIds: (ids: string[]) => void;

  statusPreset: StatusPreset;
  customStatuses: AppointmentStatusCode[];
  onChangeStatusPreset: (p: StatusPreset) => void;
  onChangeCustomStatuses: (s: AppointmentStatusCode[]) => void;

  visibleRange: VisibleRange;
  onChangeVisibleRange: (r: VisibleRange) => void;

  onOpenQuickSearch: () => void;

  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const labelClass =
    "block text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500 mb-1.5";

  const body = (
    <div className="divide-y divide-[#f0ebe5]">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">
          Filtros
        </h2>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="hidden lg:grid h-6 w-6 place-items-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          aria-label="Colapsar sidebar"
          title="Colapsar"
        >
          «
        </button>
        <button
          type="button"
          onClick={onMobileClose}
          className="lg:hidden grid h-7 w-7 place-items-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      {/* Sucursal */}
      <div className="px-4 py-3">
        <label className={labelClass}>Sucursal</label>
        <select
          value={branchId}
          onChange={(e) => onChangeBranch(e.target.value)}
          className="h-8 w-full rounded-md border border-[#e8e2dc] bg-white px-2.5 text-[13px] text-stone-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Profesional */}
      <div className="px-4 py-3">
        <label className={labelClass}>Profesional</label>
        <AgendaBarberSelect
          barbers={barbers}
          selected={barberIds}
          onChange={onChangeBarberIds}
        />
      </div>

      {/* Estado */}
      <div className="px-4 py-3">
        <label className={labelClass}>Estado</label>
        <AgendaStatusFilter
          preset={statusPreset}
          customStatuses={customStatuses}
          onChangePreset={onChangeStatusPreset}
          onChangeCustom={onChangeCustomStatuses}
        />
      </div>

      {/* Rango visible */}
      <div className="px-4 py-3">
        <label className={labelClass}>Horario visible</label>
        <AgendaVisibleRangeSelect
          value={visibleRange}
          onChange={onChangeVisibleRange}
        />
      </div>

      {/* Quick search */}
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={onOpenQuickSearch}
          className="w-full rounded-md border border-[#e8e2dc] bg-stone-50/60 px-2.5 py-2 text-left hover:bg-white hover:border-brand/40 transition flex items-center gap-2"
        >
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand/10 text-brand shrink-0">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 3a6 6 0 1 0 3.5 10.9l3.3 3.3 1.4-1.4-3.3-3.3A6 6 0 0 0 9 3zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-stone-800 leading-tight">
              Búsqueda rápida
            </div>
            <div className="text-[10px] text-stone-500 leading-tight">
              Primer slot libre
            </div>
          </div>
        </button>
      </div>

    </div>
  );

  const collapsedRail = (
    <button
      type="button"
      onClick={() => setCollapsed(false)}
      className="hidden lg:flex flex-col items-start gap-2 w-11 border-r border-[#e8e2dc] bg-white text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition pt-3"
      aria-label="Mostrar filtros"
      title="Mostrar filtros"
    >
      {/* Icono de filtro + flecha — reconocible como "abrir panel de filtros" */}
      <div className="mx-auto flex flex-col items-center gap-3">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="text-stone-500">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 01.8 1.6L12 11v5a1 1 0 01-.6.9l-2 .8A1 1 0 018 16.8V11L3.2 4.6A1 1 0 014 3h-.01z" />
        </svg>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-stone-400">
          <path d="M3 1l4 4-4 4" />
        </svg>
      </div>
    </button>
  );

  return (
    <>
      {/* Desktop */}
      {collapsed ? (
        collapsedRail
      ) : (
        <aside
          className="hidden lg:block shrink-0 border-r border-[#e8e2dc] bg-white overflow-y-auto overflow-x-hidden"
          style={{ width: 240 }}
        >
          {body}
        </aside>
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={onMobileClose}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-xl overflow-y-auto">
            {body}
          </aside>
        </div>
      )}
    </>
  );
}
