"use client";

import { useCallback, useEffect, useState } from "react";
import PageTip from "@/components/ui/PageTip";
import InfoTip from "@/components/ui/InfoTip";
import { formatCLP } from "@/lib/format";

type Barber = {
  id: string;
  name: string;
  color: string;
  branchId: string;
  commissionType: "PERCENTAGE" | "FIXED";
  commissionValue: number;
};
type ServiceOption = { id: string; name: string; durationMin: number; price: number; active: boolean };
type BarberServiceAssign = { serviceId: string; customPrice: number | null; customDuration: number | null };

export default function BarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [allServices, setAllServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [innerTab, setInnerTab] = useState<"services" | "commission">("services");

  // Services tab state
  const [assignments, setAssignments] = useState<BarberServiceAssign[]>([]);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [saving, setSaving] = useState(false);

  // Commission tab state
  const [commissionType, setCommissionType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [commissionValue, setCommissionValue] = useState<string>("0");
  const [savingCommission, setSavingCommission] = useState(false);
  const [commissionSaved, setCommissionSaved] = useState(false);

  const fetchData = useCallback(() => {
    Promise.all([
      fetch("/api/admin/barbers").then((r) => r.json()),
      fetch("/api/admin/services?all=true").then((r) => r.json()),
    ])
      .then(([bd, sd]) => {
        setBarbers(bd.barbers || []);
        setAllServices((sd.services || []).filter((s: ServiceOption) => s.active));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function selectBarber(id: string) {
    setSelectedBarber(id);
    setInnerTab("services");
    setCommissionSaved(false);

    // Load services assignment
    setLoadingAssign(true);
    fetch(`/api/admin/barbers/${id}/services`)
      .then((r) => r.json())
      .then((d) => {
        setAssignments(
          (d.services || []).map((s: { serviceId: string; customPrice: number | null; customDuration: number | null }) => ({
            serviceId: s.serviceId,
            customPrice: s.customPrice,
            customDuration: s.customDuration,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoadingAssign(false));

    // Populate commission fields from cached barber data
    const barber = barbers.find((b) => b.id === id);
    if (barber) {
      setCommissionType(barber.commissionType);
      setCommissionValue(String(barber.commissionValue));
    }
  }

  function toggleService(serviceId: string) {
    setAssignments((prev) => {
      const exists = prev.find((a) => a.serviceId === serviceId);
      if (exists) return prev.filter((a) => a.serviceId !== serviceId);
      return [...prev, { serviceId, customPrice: null, customDuration: null }];
    });
  }

  function updateCustom(serviceId: string, field: "customPrice" | "customDuration", value: string) {
    setAssignments((prev) =>
      prev.map((a) =>
        a.serviceId === serviceId
          ? { ...a, [field]: value ? Number(value) : null }
          : a
      )
    );
  }

  async function saveAssignments() {
    if (!selectedBarber) return;
    setSaving(true);
    await fetch(`/api/admin/barbers/${selectedBarber}/services`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ services: assignments }),
    });
    setSaving(false);
  }

  async function saveCommission() {
    if (!selectedBarber) return;
    setSavingCommission(true);
    await fetch(`/api/admin/barbers/${selectedBarber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commissionType, commissionValue: Number(commissionValue) }),
    });
    // Update local barber list
    setBarbers((prev) =>
      prev.map((b) =>
        b.id === selectedBarber ? { ...b, commissionType, commissionValue: Number(commissionValue) } : b
      )
    );
    setSavingCommission(false);
    setCommissionSaved(true);
  }

  const activeBarber = barbers.find((b) => b.id === selectedBarber);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Barberos</h1>
        <p className="text-sm text-stone-500">Gestiona servicios y comisiones de cada profesional</p>
      </div>

      <PageTip id="barberos" text="Primero asigna servicios a cada barbero. Luego configura sus comisiones en la pestaña 'Comisión'." />

      {loading && <div className="text-center text-stone-400 py-8">Cargando...</div>}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* Barber list */}
          <div className="space-y-2">
            {barbers.map((b) => {
              const initials = b.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
              const isActive = b.id === selectedBarber;
              return (
                <button
                  key={b.id}
                  onClick={() => selectBarber(b.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    isActive
                      ? "border-brand bg-brand/5"
                      : "border-[#e8e2dc] bg-white hover:border-brand/30"
                  }`}
                >
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: b.color || "#c87941" }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-stone-800 text-sm">{b.name}</p>
                    <p className="text-[11px] text-stone-400">
                      {b.commissionType === "PERCENTAGE"
                        ? `${b.commissionValue}% por servicio`
                        : `${formatCLP(b.commissionValue)} fijo/cita`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail panel */}
          <div className="rounded-xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
            {!selectedBarber && (
              <p className="text-stone-400 text-sm text-center py-12">
                Selecciona un barbero para gestionar
              </p>
            )}

            {selectedBarber && (
              <>
                {/* Inner tabs */}
                <div className="flex border-b border-[#e8e2dc] px-5 pt-4 gap-1">
                  <button
                    onClick={() => setInnerTab("services")}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition border-b-2 ${
                      innerTab === "services"
                        ? "border-brand text-brand"
                        : "border-transparent text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    Servicios
                  </button>
                  <button
                    onClick={() => { setInnerTab("commission"); setCommissionSaved(false); }}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition border-b-2 ${
                      innerTab === "commission"
                        ? "border-brand text-brand"
                        : "border-transparent text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    Comisión
                  </button>
                </div>

                <div className="p-5">
                  {/* Services tab */}
                  {innerTab === "services" && (
                    <>
                      {loadingAssign && <p className="text-stone-400 text-sm text-center py-8">Cargando...</p>}
                      {!loadingAssign && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h2 className="font-bold text-stone-900">
                              Servicios de {activeBarber?.name}
                            </h2>
                            <button onClick={saveAssignments} disabled={saving} className="btn-primary text-xs">
                              {saving ? "Guardando..." : "Guardar"}
                            </button>
                          </div>

                          <p className="text-xs text-stone-400">
                            Marca los servicios que este barbero ofrece. Puedes personalizar precio y duración.
                          </p>

                          <div className="space-y-1">
                            {allServices.map((svc) => {
                              const assigned = assignments.find((a) => a.serviceId === svc.id);
                              return (
                                <div key={svc.id} className="border-b border-[#e8e2dc] last:border-0 py-3">
                                  <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={!!assigned}
                                      onChange={() => toggleService(svc.id)}
                                      className="mt-1 h-4 w-4 rounded border-stone-300 text-brand focus:ring-brand/20 accent-brand"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-stone-800">{svc.name}</p>
                                      <p className="text-xs text-stone-400">{svc.durationMin} min — {formatCLP(svc.price)}</p>
                                    </div>
                                  </label>

                                  {assigned && (
                                    <div className="ml-7 mt-2 flex gap-3">
                                      <div>
                                        <label className="text-[10px] text-stone-400 uppercase">Precio personalizado</label>
                                        <input
                                          type="number"
                                          className="input-field text-xs mt-0.5"
                                          placeholder={String(svc.price)}
                                          value={assigned.customPrice ?? ""}
                                          onChange={(e) => updateCustom(svc.id, "customPrice", e.target.value)}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] text-stone-400 uppercase">Duración personalizada</label>
                                        <input
                                          type="number"
                                          className="input-field text-xs mt-0.5"
                                          placeholder={String(svc.durationMin)}
                                          value={assigned.customDuration ?? ""}
                                          onChange={(e) => updateCustom(svc.id, "customDuration", e.target.value)}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Commission tab */}
                  {innerTab === "commission" && (
                    <div className="space-y-5 max-w-sm">
                      <div>
                        <h2 className="font-bold text-stone-900 flex items-center">
                          Comisión de {activeBarber?.name}
                          <InfoTip text="La comisión es el porcentaje o monto fijo que el barbero gana por cada cita completada. Se calcula automáticamente en Reportes → Liquidaciones." />
                        </h2>
                        <p className="text-xs text-stone-400 mt-1">
                          Define cómo se calcula la comisión. Se usa en el reporte de liquidaciones.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Tipo de comisión</label>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => setCommissionType("PERCENTAGE")}
                              className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition ${
                                commissionType === "PERCENTAGE"
                                  ? "border-brand bg-brand/10 text-brand"
                                  : "border-[#e8e2dc] text-stone-500 hover:bg-stone-50"
                              }`}
                            >
                              Porcentaje (%)
                            </button>
                            <button
                              onClick={() => setCommissionType("FIXED")}
                              className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition ${
                                commissionType === "FIXED"
                                  ? "border-brand bg-brand/10 text-brand"
                                  : "border-[#e8e2dc] text-stone-500 hover:bg-stone-50"
                              }`}
                            >
                              Monto fijo (CLP)
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                            {commissionType === "PERCENTAGE" ? "Porcentaje (0–100)" : "Monto por cita (CLP)"}
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={commissionType === "PERCENTAGE" ? "100" : undefined}
                            className="input-field mt-1"
                            value={commissionValue}
                            onChange={(e) => { setCommissionValue(e.target.value); setCommissionSaved(false); }}
                          />
                          <p className="text-xs text-stone-400 mt-1">
                            {commissionType === "PERCENTAGE"
                              ? `Por cada cita de ${formatCLP(10000)}, el barbero recibirá ${formatCLP(10000 * Number(commissionValue || 0) / 100)}`
                              : `El barbero recibe ${formatCLP(Number(commissionValue || 0))} fijo por cada cita completada`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={saveCommission}
                          disabled={savingCommission}
                          className="btn-primary"
                        >
                          {savingCommission ? "Guardando..." : "Guardar comisión"}
                        </button>
                        {commissionSaved && <span className="text-xs text-green-600 font-medium">Guardado</span>}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
