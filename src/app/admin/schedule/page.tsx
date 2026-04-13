"use client";

import { useCallback, useEffect, useState } from "react";
import PageTip from "@/components/ui/PageTip";
import InfoTip from "@/components/ui/InfoTip";

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
const DEFAULT_START = "09:00";
const DEFAULT_END = "18:00";

type BranchHour = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
};

type BarberDay = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorking: boolean;
};

type Branch = {
  id: string;
  name: string;
  workingHours: BranchHour[];
};

type Barber = {
  id: string;
  name: string;
  color: string | null;
};

function initBranchHours(existing: BranchHour[]): BranchHour[] {
  return DAYS.map(({ dayOfWeek }) => {
    const found = existing.find((h) => h.dayOfWeek === dayOfWeek);
    return found ?? { dayOfWeek, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE, isOpen: dayOfWeek !== 0 };
  });
}

function initBarberSchedule(existing: BarberDay[]): BarberDay[] {
  return DAYS.map(({ dayOfWeek }) => {
    const found = existing.find((s) => s.dayOfWeek === dayOfWeek);
    return found ?? { dayOfWeek, startTime: DEFAULT_START, endTime: DEFAULT_END, isWorking: dayOfWeek !== 0 };
  });
}

export default function SchedulePage() {
  const [tab, setTab] = useState<"branch" | "barbers">("branch");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [branchHours, setBranchHours] = useState<BranchHour[]>([]);
  const [savingBranch, setSavingBranch] = useState(false);
  const [branchSaved, setBranchSaved] = useState(false);

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [barberSchedule, setBarberSchedule] = useState<BarberDay[]>([]);
  const [loadingBarber, setLoadingBarber] = useState(false);
  const [savingBarber, setSavingBarber] = useState(false);
  const [barberSaved, setBarberSaved] = useState(false);

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
    fetch("/api/admin/barbers")
      .then((r) => r.json())
      .then((d) => setBarbers(d.barbers || []))
      .catch(() => {});
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

  const branchTimeErrors = branchHours
    .filter((h) => h.isOpen && h.openTime >= h.closeTime)
    .map((h) => DAYS.find((d) => d.dayOfWeek === h.dayOfWeek)?.label);

  async function saveBranchHours() {
    if (!selectedBranch) return;
    if (branchTimeErrors.length > 0) return;
    setSavingBranch(true);
    await fetch("/api/admin/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId: selectedBranch, hours: branchHours }),
    });
    setSavingBranch(false);
    setBranchSaved(true);
    const r = await fetch("/api/admin/schedule");
    const d = await r.json();
    setBranches(d.branches || []);
  }

  function handleSelectBarber(barberId: string) {
    setSelectedBarber(barberId);
    setLoadingBarber(true);
    setBarberSaved(false);
    fetch(`/api/admin/barbers/${barberId}/schedule`)
      .then((r) => r.json())
      .then((d) => setBarberSchedule(initBarberSchedule(d.schedule || [])))
      .catch(() => {})
      .finally(() => setLoadingBarber(false));
  }

  function updateBarberDay(dayOfWeek: number, field: keyof BarberDay, value: string | boolean) {
    setBarberSchedule((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s))
    );
    setBarberSaved(false);
  }

  const barberTimeErrors = barberSchedule
    .filter((s) => s.isWorking && s.startTime >= s.endTime)
    .map((s) => DAYS.find((d) => d.dayOfWeek === s.dayOfWeek)?.label);

  async function saveBarberSchedule() {
    if (!selectedBarber) return;
    if (barberTimeErrors.length > 0) return;
    setSavingBarber(true);
    await fetch(`/api/admin/barbers/${selectedBarber}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule: barberSchedule }),
    });
    setSavingBarber(false);
    setBarberSaved(true);
  }

  const activeBarber = barbers.find((b) => b.id === selectedBarber);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Horarios</h1>
        <p className="text-sm text-stone-500">Configura el horario de apertura de la sucursal y la disponibilidad de cada barbero</p>
      </div>

      <PageTip id="horarios" text="Configura los horarios de la sucursal primero, luego los de cada barbero. Los barberos solo podrán recibir citas dentro de estos horarios." />

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-[#e8e2dc] bg-white p-1">
          <button
            onClick={() => setTab("branch")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === "branch" ? "bg-brand text-white shadow-sm" : "text-stone-500 hover:bg-stone-50"
            }`}
          >
            Sucursal
          </button>
          <button
            onClick={() => setTab("barbers")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === "barbers" ? "bg-brand text-white shadow-sm" : "text-stone-500 hover:bg-stone-50"
            }`}
          >
            Barberos
          </button>
        </div>
        <InfoTip text={tab === "branch"
          ? "Los horarios de la sucursal definen cuándo está abierta. Los barberos solo pueden atender dentro de estas horas."
          : "Configura el horario de trabajo individual de cada barbero. Solo verán disponibilidad dentro de su horario."
        } />
      </div>

      {loading ? (
        <div className="text-center text-stone-400 py-12">Cargando...</div>
      ) : tab === "branch" ? (
        /* ── Branch working hours ── */
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
          {/* Branch selector */}
          {branches.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 px-1">Sucursales</p>
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleSelectBranch(b.id)}
                  className={`w-full text-left rounded-xl border p-3 text-sm font-medium transition ${
                    selectedBranch === b.id
                      ? "border-brand bg-brand/5 text-stone-900"
                      : "border-[#e8e2dc] bg-white text-stone-600 hover:border-brand/30"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}

          {/* Hours grid */}
          <div className="rounded-xl border border-[#e8e2dc] bg-white shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e2dc]">
              <h2 className="font-bold text-stone-900 text-sm">
                Horario de apertura
                {branches.length === 1 && branches[0] && (
                  <span className="ml-2 font-normal text-stone-400">— {branches[0].name}</span>
                )}
              </h2>
              <div className="flex items-center gap-3">
                {branchSaved && <span className="text-xs text-green-600 font-medium">Guardado</span>}
                <button onClick={saveBranchHours} disabled={savingBranch || branchTimeErrors.length > 0} className="btn-primary text-xs">
                  {savingBranch ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>

            {branchTimeErrors.length > 0 && (
              <div className="mx-5 mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                Apertura debe ser anterior al cierre en: {branchTimeErrors.join(", ")}
              </div>
            )}

            <div className="divide-y divide-[#f0ece8]">
              {DAYS.map(({ dayOfWeek, label }) => {
                const hour = branchHours.find((h) => h.dayOfWeek === dayOfWeek);
                if (!hour) return null;
                return (
                  <div key={dayOfWeek} className={`flex items-center gap-3 px-5 py-3 ${!hour.isOpen ? "opacity-40" : ""}`}>
                    <span className="w-24 text-sm font-medium text-stone-700 shrink-0">{label}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <input type="time" value={hour.openTime} disabled={!hour.isOpen}
                        onChange={(e) => updateBranchHour(dayOfWeek, "openTime", e.target.value)}
                        className="input-field text-sm w-28 disabled:cursor-not-allowed" />
                      <span className="text-stone-300 text-xs">a</span>
                      <input type="time" value={hour.closeTime} disabled={!hour.isOpen}
                        onChange={(e) => updateBranchHour(dayOfWeek, "closeTime", e.target.value)}
                        className="input-field text-sm w-28 disabled:cursor-not-allowed" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                      <input type="checkbox" checked={hour.isOpen}
                        onChange={(e) => updateBranchHour(dayOfWeek, "isOpen", e.target.checked)}
                        className="h-4 w-4 rounded border-stone-300 text-brand accent-brand" />
                      <span className="text-[10px] text-stone-400 hidden sm:inline">{hour.isOpen ? "Abierto" : "Cerrado"}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── Barber schedules ── */
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
          {/* Barber list */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 px-1">Barberos</p>
            {barbers.map((b) => {
              const initials = b.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
              return (
                <button
                  key={b.id}
                  onClick={() => handleSelectBarber(b.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    selectedBarber === b.id
                      ? "border-brand bg-brand/5"
                      : "border-[#e8e2dc] bg-white hover:border-brand/30"
                  }`}
                >
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                    style={{ backgroundColor: b.color || "#c87941" }}
                  >
                    {initials}
                  </div>
                  <span className="font-medium text-stone-800 text-sm">{b.name}</span>
                </button>
              );
            })}
          </div>

          {/* Schedule grid */}
          <div className="rounded-xl border border-[#e8e2dc] bg-white p-5 shadow-sm">
            {!selectedBarber && (
              <p className="text-stone-400 text-sm text-center py-12">
                Selecciona un barbero para configurar su horario
              </p>
            )}

            {selectedBarber && loadingBarber && (
              <p className="text-stone-400 text-sm text-center py-12">Cargando...</p>
            )}

            {selectedBarber && !loadingBarber && (
              <>
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e2dc] -mx-5 -mt-5 mb-0 rounded-t-xl">
                  <h2 className="font-bold text-stone-900 text-sm">Horario de {activeBarber?.name}</h2>
                  <div className="flex items-center gap-3">
                    {barberSaved && <span className="text-xs text-green-600 font-medium">Guardado</span>}
                    <button onClick={saveBarberSchedule} disabled={savingBarber || barberTimeErrors.length > 0} className="btn-primary text-xs">
                      {savingBarber ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </div>

                {barberTimeErrors.length > 0 && (
                  <div className="mx-0 mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                    Entrada debe ser anterior a la salida en: {barberTimeErrors.join(", ")}
                  </div>
                )}

                <div className="divide-y divide-[#f0ece8] -mx-5">
                  {DAYS.map(({ dayOfWeek, label }) => {
                    const day = barberSchedule.find((s) => s.dayOfWeek === dayOfWeek);
                    if (!day) return null;
                    return (
                      <div key={dayOfWeek} className={`flex items-center gap-3 px-5 py-3 ${!day.isWorking ? "opacity-40" : ""}`}>
                        <span className="w-24 text-sm font-medium text-stone-700 shrink-0">{label}</span>
                        <div className="flex items-center gap-2 flex-1">
                          <input type="time" value={day.startTime} disabled={!day.isWorking}
                            onChange={(e) => updateBarberDay(dayOfWeek, "startTime", e.target.value)}
                            className="input-field text-sm w-28 disabled:cursor-not-allowed" />
                          <span className="text-stone-300 text-xs">a</span>
                          <input type="time" value={day.endTime} disabled={!day.isWorking}
                            onChange={(e) => updateBarberDay(dayOfWeek, "endTime", e.target.value)}
                            className="input-field text-sm w-28 disabled:cursor-not-allowed" />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer shrink-0">
                          <input type="checkbox" checked={day.isWorking}
                            onChange={(e) => updateBarberDay(dayOfWeek, "isWorking", e.target.checked)}
                            className="h-4 w-4 rounded border-stone-300 text-brand accent-brand" />
                          <span className="text-[10px] text-stone-400 hidden sm:inline">{day.isWorking ? "Trabaja" : "Libre"}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
