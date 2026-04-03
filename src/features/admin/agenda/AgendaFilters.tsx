"use client";

import type { BarberOption, BranchOption } from "@/types/agenda";

export default function AgendaFilters({
  branches,
  barbers,
  branchId,
  barberId,
  status,
  onChangeBranch,
  onChangeBarber,
  onChangeStatus,
}: {
  branches: BranchOption[];
  barbers: BarberOption[];
  branchId: string;
  barberId: string;
  status: "ACTIVE" | "ALL";
  onChangeBranch: (v: string) => void;
  onChangeBarber: (v: string) => void;
  onChangeStatus: (v: "ACTIVE" | "ALL") => void;
}) {
  const selectClass =
    "h-9 rounded-lg border border-[#e8e2dc] bg-white px-3 text-sm text-stone-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15";

  return (
    <div className="flex items-center gap-2 flex-wrap" data-tour-id="agenda-filters">
      <select className={selectClass} value={branchId} onChange={(e) => onChangeBranch(e.target.value)}>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>

      <select className={selectClass} value={barberId} onChange={(e) => onChangeBarber(e.target.value)}>
        <option value="">Todos los profesionales</option>
        {barbers.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>

      <select className={selectClass} value={status} onChange={(e) => onChangeStatus(e.target.value as "ACTIVE" | "ALL")}>
        <option value="ACTIVE">Activas</option>
        <option value="ALL">Todas</option>
      </select>
    </div>
  );
}
