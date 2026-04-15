"use client";

import type { AppointmentStatusCode, StatusPreset } from "@/types/agenda";
import { STATUS_CONFIG } from "@/lib/constants";
import {
  STATUS_ACTIVE,
  STATUS_HISTORY,
  STATUS_ALL,
} from "./agendaFilters";

const PRESET_OPTIONS: Array<{ value: StatusPreset; label: string }> = [
  { value: "ACTIVE", label: "Reservas activas" },
  { value: "HISTORY", label: "Historial" },
  { value: "ALL", label: "Todas" },
  { value: "CUSTOM", label: "Personalizado" },
];

export default function AgendaStatusFilter({
  preset,
  customStatuses,
  onChangePreset,
  onChangeCustom,
}: {
  preset: StatusPreset;
  customStatuses: AppointmentStatusCode[];
  onChangePreset: (p: StatusPreset) => void;
  onChangeCustom: (s: AppointmentStatusCode[]) => void;
}) {
  function toggleStatus(code: AppointmentStatusCode) {
    const has = customStatuses.includes(code);
    const next = has
      ? customStatuses.filter((x) => x !== code)
      : [...customStatuses, code];
    onChangeCustom(next);
  }

  // Al cambiar a un preset, precargamos customStatuses con su valor para facilitar ajustes finos.
  function handlePresetChange(p: StatusPreset) {
    onChangePreset(p);
    if (p === "ACTIVE") onChangeCustom(STATUS_ACTIVE);
    else if (p === "HISTORY") onChangeCustom(STATUS_HISTORY);
    else if (p === "ALL") onChangeCustom(STATUS_ALL);
  }

  const activeSet = new Set(customStatuses);

  return (
    <div className="space-y-2">
      <select
        value={preset}
        onChange={(e) => handlePresetChange(e.target.value as StatusPreset)}
        className="h-9 w-full rounded-lg border border-[#e8e2dc] bg-white px-3 text-sm text-stone-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
      >
        {PRESET_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {preset === "CUSTOM" && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(Object.keys(STATUS_CONFIG) as AppointmentStatusCode[]).map((code) => {
            const cfg = STATUS_CONFIG[code];
            const active = activeSet.has(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggleStatus(code)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition border flex items-center gap-1.5 ${
                  active
                    ? `${cfg.bg} ${cfg.text} border-transparent shadow-sm`
                    : "bg-white text-stone-500 border-[#e8e2dc] hover:border-brand/40"
                }`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                />
                {cfg.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
