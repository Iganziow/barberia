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
import MiniMonthCalendar from "./MiniMonthCalendar";

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

  selectedDate,
  onSelectDate,

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

  selectedDate: Date;
  onSelectDate: (d: Date) => void;

  onOpenQuickSearch: () => void;

  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const body = (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-stone-900">Filtros</h2>
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
          className="lg:hidden grid h-6 w-6 place-items-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      {/* Sucursal */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
          Sucursal
        </label>
        <select
          value={branchId}
          onChange={(e) => onChangeBranch(e.target.value)}
          className="h-9 w-full rounded-lg border border-[#e8e2dc] bg-white px-3 text-sm text-stone-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Profesional */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
          Profesional
        </label>
        <AgendaBarberSelect
          barbers={barbers}
          selected={barberIds}
          onChange={onChangeBarberIds}
        />
      </div>

      {/* Estado */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
          Estado de la reserva
        </label>
        <AgendaStatusFilter
          preset={statusPreset}
          customStatuses={customStatuses}
          onChangePreset={onChangeStatusPreset}
          onChangeCustom={onChangeCustomStatuses}
        />
      </div>

      {/* Rango visible */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
          Rango horario visible
        </label>
        <AgendaVisibleRangeSelect
          value={visibleRange}
          onChange={onChangeVisibleRange}
        />
      </div>

      {/* Quick search */}
      <button
        type="button"
        onClick={onOpenQuickSearch}
        className="w-full rounded-lg border border-[#e8e2dc] bg-stone-50 px-3 py-2.5 text-left hover:bg-white hover:border-brand/40 transition flex items-center gap-2"
      >
        <span className="grid h-7 w-7 place-items-center rounded-md bg-brand/10 text-brand shrink-0">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 3a6 6 0 1 0 3.5 10.9l3.3 3.3 1.4-1.4-3.3-3.3A6 6 0 0 0 9 3zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
          </svg>
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-stone-800 leading-tight">
            Búsqueda rápida de hora
          </div>
          <div className="text-[10px] text-stone-500 leading-tight">
            Encuentra el primer slot libre
          </div>
        </div>
      </button>

      {/* Mini calendar */}
      <div className="pt-2 border-t border-[#f0ebe5]">
        <MiniMonthCalendar
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
        />
      </div>
    </div>
  );

  const collapsedRail = (
    <button
      type="button"
      onClick={() => setCollapsed(false)}
      className="hidden lg:flex flex-col items-center justify-center gap-3 w-12 border-r border-[#e8e2dc] bg-white text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition"
      aria-label="Expandir sidebar"
      title="Expandir"
    >
      <span className="text-lg">»</span>
      <span
        className="text-[10px] uppercase tracking-wider rotate-180"
        style={{ writingMode: "vertical-rl" }}
      >
        Filtros
      </span>
    </button>
  );

  return (
    <>
      {/* Desktop */}
      {collapsed ? (
        collapsedRail
      ) : (
        <aside className="hidden lg:block w-[260px] shrink-0 border-r border-[#e8e2dc] bg-white overflow-y-auto">
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
