"use client";

import { useCallback, useEffect, useState } from "react";
import PageTip from "@/components/ui/PageTip";
import InfoTip from "@/components/ui/InfoTip";
import Modal from "@/components/ui/modal";
import { formatCLP } from "@/lib/format";

type Barber = { id: string; name: string; email: string; phone: string | null; color: string; active: boolean; commissionType: "PERCENTAGE" | "FIXED"; commissionValue: number };
type ServiceOption = { id: string; name: string; durationMin: number; price: number; active: boolean };
type BarberServiceAssign = { serviceId: string; customPrice: number | null; customDuration: number | null };

export default function BarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [allServices, setAllServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [innerTab, setInnerTab] = useState<"profile" | "services" | "commission">("profile");
  const [assignments, setAssignments] = useState<BarberServiceAssign[]>([]);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commissionType, setCommissionType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [commissionValue, setCommissionValue] = useState("0");
  const [savingCommission, setSavingCommission] = useState(false);
  const [commissionSaved, setCommissionSaved] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editColor, setEditColor] = useState("#c87941");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createColor, setCreateColor] = useState("#c87941");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(null), 3000); }

  const [assignError, setAssignError] = useState("");

  // Estado para "copiar servicios desde otro barbero"
  const [showCopyServices, setShowCopyServices] = useState(false);
  const [copySourceId, setCopySourceId] = useState<string>("");
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState("");

  async function copyServicesFrom() {
    if (!copySourceId || !selectedBarber) return;
    setCopying(true);
    setCopyError("");
    try {
      // 1) Trae los servicios del barbero fuente
      const r = await fetch(`/api/admin/barbers/${copySourceId}/services`);
      if (!r.ok) throw new Error("No se pudieron leer los servicios del barbero origen");
      const d = await r.json();
      const sourceServices: BarberServiceAssign[] = (d.services || []).map(
        (s: BarberServiceAssign) => ({
          serviceId: s.serviceId,
          customPrice: s.customPrice,
          customDuration: s.customDuration,
        })
      );
      // 2) Los asigna al barbero actual (reemplaza las asignaciones actuales en memoria)
      setAssignments(sourceServices);
      setShowCopyServices(false);
      setCopySourceId("");
      showToast(`Copiado desde ${barbers.find((b) => b.id === copySourceId)?.name ?? "otro barbero"}. Pulsa Guardar para aplicar.`);
    } catch (e) {
      setCopyError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setCopying(false);
    }
  }

  const fetchData = useCallback(() => {
    Promise.all([fetch("/api/admin/barbers").then(r => r.json()), fetch("/api/admin/services?all=true").then(r => r.json())])
      .then(([bd, sd]) => { setBarbers(bd.barbers || []); setAllServices((sd.services || []).filter((s: ServiceOption) => s.active)); })
      .catch(() => showToast("Error al cargar barberos. Revisa tu conexión.")).finally(() => setLoading(false));
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  function selectBarber(id: string) {
    setSelectedBarber(id); setInnerTab("profile"); setProfileSaved(false); setProfileError("");
    setLoadingAssign(true);
    setAssignError("");
    fetch(`/api/admin/barbers/${id}/services`)
      .then(async r => {
        if (!r.ok) throw new Error("No se pudieron cargar los servicios del barbero");
        return r.json();
      })
      .then(d => setAssignments((d.services || []).map((s: BarberServiceAssign) => ({ serviceId: s.serviceId, customPrice: s.customPrice, customDuration: s.customDuration }))))
      .catch((e: Error) => setAssignError(e.message || "Error de conexión")).finally(() => setLoadingAssign(false));
    const b = barbers.find(x => x.id === id);
    if (b) { setEditName(b.name); setEditEmail(b.email || ""); setEditPhone(b.phone || ""); setEditColor(b.color || "#c87941"); setCommissionType(b.commissionType); setCommissionValue(String(b.commissionValue)); }
  }

  async function saveProfile() {
    if (!selectedBarber) return; setSavingProfile(true); setProfileError(""); setProfileSaved(false);
    const r = await fetch(`/api/admin/barbers/${selectedBarber}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName.trim(), email: editEmail.trim(), phone: editPhone.trim() || null, color: editColor }) });
    if (r.ok) { setProfileSaved(true); setBarbers(p => p.map(b => b.id === selectedBarber ? { ...b, name: editName.trim(), email: editEmail.trim(), phone: editPhone.trim() || null, color: editColor } : b)); }
    else { const d = await r.json().catch(() => ({ message: "Error" })); setProfileError(d.message); }
    setSavingProfile(false);
  }

  async function changePassword() {
    if (!selectedBarber || newPassword.length < 6) return; setSavingPassword(true);
    const r = await fetch(`/api/admin/barbers/${selectedBarber}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: newPassword }) });
    if (r.ok) { setPasswordSaved(true); setNewPassword(""); setTimeout(() => { setShowPassword(false); setPasswordSaved(false); }, 1500); }
    setSavingPassword(false);
  }

  async function deactivateBarber(id: string) {
    if (!window.confirm("Desactivar este barbero? No aparecera en el booking.")) return;
    try {
      const r = await fetch(`/api/admin/barbers/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({ message: "No se pudo desactivar" }));
        showToast(d.message || "No se pudo desactivar el barbero");
        return;
      }
      setBarbers(p => p.filter(b => b.id !== id));
      if (selectedBarber === id) setSelectedBarber(null);
      showToast("Barbero desactivado");
    } catch {
      showToast("Error de conexión al desactivar");
    }
  }

  async function createBarber() {
    setCreating(true); setCreateError("");
    const r = await fetch("/api/admin/barbers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: createName.trim(), email: createEmail.trim(), phone: createPhone.trim() || null, password: createPassword, color: createColor }) });
    if (r.ok) { setShowCreate(false); setCreateName(""); setCreateEmail(""); setCreatePhone(""); setCreatePassword(""); fetchData(); showToast("Barbero creado"); }
    else { const d = await r.json().catch(() => ({ message: "Error" })); setCreateError(d.message); }
    setCreating(false);
  }

  function toggleService(sid: string) { setAssignments(p => p.find(a => a.serviceId === sid) ? p.filter(a => a.serviceId !== sid) : [...p, { serviceId: sid, customPrice: null, customDuration: null }]); }
  async function saveAssignments() {
    if (!selectedBarber) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/barbers/${selectedBarber}/services`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ services: assignments }) });
      if (!r.ok) {
        const d = await r.json().catch(() => ({ message: "Error al guardar servicios" }));
        showToast(d.message || "Error al guardar servicios");
        return;
      }
      showToast("Servicios guardados");
    } catch {
      showToast("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  }
  async function saveCommission() {
    if (!selectedBarber) return;
    // Validación de bounds: % entre 0-100, fijo >= 0
    const v = Number(commissionValue);
    if (Number.isNaN(v) || v < 0) { showToast("Valor de comisión inválido"); return; }
    if (commissionType === "PERCENTAGE" && v > 100) { showToast("El porcentaje no puede superar 100%"); return; }
    setSavingCommission(true);
    try {
      const r = await fetch(`/api/admin/barbers/${selectedBarber}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commissionType, commissionValue: v }) });
      if (!r.ok) {
        const d = await r.json().catch(() => ({ message: "Error al guardar comisión" }));
        showToast(d.message || "Error al guardar comisión");
        return;
      }
      setBarbers(p => p.map(b => b.id === selectedBarber ? { ...b, commissionType, commissionValue: v } : b));
      setCommissionSaved(true);
    } catch {
      showToast("Error de conexión");
    } finally {
      setSavingCommission(false);
    }
  }

  const ab = barbers.find(b => b.id === selectedBarber);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-xl font-bold tracking-tight text-stone-900">Barberos</h1><p className="text-sm text-stone-500">Gestiona tu equipo: perfiles, servicios y comisiones</p></div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm self-start sm:self-auto">+ Nuevo barbero</button>
      </div>
      <PageTip id="barberos" text="Selecciona un barbero para editar su perfil, asignar servicios o configurar su comision." />
      {loading && <div className="text-center text-stone-400 py-8">Cargando...</div>}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          <div className="space-y-2">
            {barbers.map(b => {
              const ini = b.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
              return (
                <div key={b.id} className={`flex items-center gap-3 rounded-xl border p-3 transition ${b.id === selectedBarber ? "border-brand bg-brand/5" : "border-[#e8e2dc] bg-white hover:border-brand/30"}`}>
                  <button onClick={() => selectBarber(b.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: b.color || "#c87941" }}>{ini}</div>
                    <div className="min-w-0"><p className="font-medium text-stone-800 text-sm truncate">{b.name}</p><p className="text-[11px] text-stone-400 truncate">{b.email}</p></div>
                  </button>
                  <button onClick={() => deactivateBarber(b.id)} className="shrink-0 text-red-400 hover:text-red-600 p-1" title="Desactivar">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              );
            })}
            {barbers.length === 0 && <div className="text-center py-8"><p className="text-sm text-stone-400">Sin barberos</p><button onClick={() => setShowCreate(true)} className="mt-2 text-xs text-brand font-medium">+ Agregar</button></div>}
          </div>
          <div className="rounded-xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
            {!selectedBarber && <p className="text-stone-400 text-sm text-center py-12">Selecciona un barbero</p>}
            {selectedBarber && ab && (<>
              <div className="flex border-b border-[#e8e2dc] px-3 sm:px-5 pt-3 gap-1 overflow-x-auto">
                {(["profile", "services", "commission"] as const).map(t => (
                  <button key={t} onClick={() => { setInnerTab(t); setProfileSaved(false); setCommissionSaved(false); }}
                    className={`shrink-0 px-3 sm:px-4 py-2 text-sm font-medium rounded-t-lg transition border-b-2 ${innerTab === t ? "border-brand text-brand" : "border-transparent text-stone-400 hover:text-stone-600"}`}>
                    {t === "profile" ? "Perfil" : t === "services" ? "Servicios" : "Comision"}
                  </button>
                ))}
              </div>
              <div className="p-5">
                {innerTab === "profile" && (
                  <div className="space-y-4 max-w-md">
                    <h2 className="font-bold text-stone-900 text-sm">Perfil de {ab.name}</h2>
                    <div className="space-y-3">
                      <div><label className="field-label">Nombre</label><input className="input-field" value={editName} onChange={e => { setEditName(e.target.value); setProfileSaved(false); }} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="field-label">Email</label><input type="email" className="input-field" value={editEmail} onChange={e => { setEditEmail(e.target.value); setProfileSaved(false); }} /></div>
                        <div><label className="field-label">Telefono</label><input className="input-field" value={editPhone} onChange={e => { setEditPhone(e.target.value); setProfileSaved(false); }} placeholder="+56..." /></div>
                      </div>
                      <div><label className="field-label">Color en calendario</label><div className="flex items-center gap-3"><input type="color" value={editColor} onChange={e => { setEditColor(e.target.value); setProfileSaved(false); }} className="h-9 w-14 rounded-lg border border-[#e8e2dc] cursor-pointer" /><span className="text-xs text-stone-400 font-mono">{editColor}</span></div></div>
                    </div>
                    {profileError && <p className="text-sm text-red-500">{profileError}</p>}
                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                      <button onClick={saveProfile} disabled={savingProfile} className="btn-primary text-sm">{savingProfile ? "Guardando..." : "Guardar perfil"}</button>
                      {profileSaved && <span className="text-xs text-green-600">Guardado</span>}
                      <button onClick={() => setShowPassword(true)} className="btn-secondary text-sm sm:ml-auto">Cambiar clave</button>
                    </div>
                  </div>
                )}
                {innerTab === "services" && (<>
                  {loadingAssign ? <p className="text-stone-400 text-sm text-center py-8">Cargando...</p> : assignError ? (
                    <div className="text-center py-8 space-y-2">
                      <p className="text-sm text-red-600">{assignError}</p>
                      <button onClick={() => selectBarber(selectedBarber!)} className="text-xs font-semibold text-brand underline">Reintentar</button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h2 className="font-bold text-stone-900 text-sm">Servicios de {ab.name}</h2>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowCopyServices(true)}
                            className="btn-secondary text-xs"
                            disabled={barbers.length < 2}
                            title={barbers.length < 2 ? "Necesitas otro barbero para copiar" : "Copiar servicios desde otro barbero"}
                          >
                            Copiar desde...
                          </button>
                          <button onClick={saveAssignments} disabled={saving} className="btn-primary text-xs">{saving ? "Guardando..." : "Guardar"}</button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {allServices.map(svc => {
                          const asgn = assignments.find(a => a.serviceId === svc.id);
                          return (
                            <div key={svc.id} className="border-b border-[#e8e2dc] last:border-0 py-2.5">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={!!asgn} onChange={() => toggleService(svc.id)} className="h-4 w-4 rounded accent-brand" />
                                <div className="flex-1"><p className="text-sm font-medium text-stone-800">{svc.name}</p><p className="text-xs text-stone-400">{svc.durationMin} min · {formatCLP(svc.price)}</p></div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>)}
                {innerTab === "commission" && (
                  <div className="space-y-5 max-w-sm">
                    <h2 className="font-bold text-stone-900 text-sm flex items-center">Comision de {ab.name}<InfoTip text="Se calcula en Reportes - Liquidaciones." /></h2>
                    <div className="space-y-4">
                      <div>
                        <label className="field-label">Tipo</label>
                        <div className="flex gap-2 mt-1">
                          <button onClick={() => setCommissionType("PERCENTAGE")} className={`flex-1 rounded-lg border py-2 text-sm font-medium ${commissionType === "PERCENTAGE" ? "border-brand bg-brand/10 text-brand" : "border-[#e8e2dc] text-stone-500"}`}>Porcentaje (%)</button>
                          <button onClick={() => setCommissionType("FIXED")} className={`flex-1 rounded-lg border py-2 text-sm font-medium ${commissionType === "FIXED" ? "border-brand bg-brand/10 text-brand" : "border-[#e8e2dc] text-stone-500"}`}>Fijo (CLP)</button>
                        </div>
                      </div>
                      <div>
                        <label className="field-label">{commissionType === "PERCENTAGE" ? "Porcentaje (0-100)" : "Monto por cita"}</label>
                        <input type="number" min="0" max={commissionType === "PERCENTAGE" ? "100" : undefined} className="input-field mt-1" value={commissionValue} onChange={e => { setCommissionValue(e.target.value); setCommissionSaved(false); }} />
                        <p className="text-xs text-stone-400 mt-1">{commissionType === "PERCENTAGE" ? `${formatCLP(10000)} -> ${formatCLP(10000 * Number(commissionValue || 0) / 100)}` : `${formatCLP(Number(commissionValue || 0))} fijo/cita`}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={saveCommission} disabled={savingCommission} className="btn-primary text-sm">{savingCommission ? "Guardando..." : "Guardar"}</button>
                      {commissionSaved && <span className="text-xs text-green-600">Guardado</span>}
                    </div>
                  </div>
                )}
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} title="Nuevo barbero" onClose={() => setShowCreate(false)} footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary text-sm" onClick={() => setShowCreate(false)}>Cancelar</button>
          <button className="btn-primary text-sm" disabled={creating || !createName.trim() || !createEmail.trim() || createPassword.length < 6} onClick={createBarber}>{creating ? "Creando..." : "Crear barbero"}</button>
        </div>
      }>
        <div className="space-y-3">
          <div><label className="field-label">Nombre *</label><input className="input-field" value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Daniel Silva" /></div>
          <div><label className="field-label">Email * (login)</label><input type="email" className="input-field" value={createEmail} onChange={e => setCreateEmail(e.target.value)} placeholder="daniel@barberia.cl" /></div>
          <div><label className="field-label">Clave * (min 6)</label><input type="password" className="input-field" value={createPassword} onChange={e => setCreatePassword(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">Telefono</label><input className="input-field" value={createPhone} onChange={e => setCreatePhone(e.target.value)} placeholder="+56..." /></div>
            <div><label className="field-label">Color</label><input type="color" value={createColor} onChange={e => setCreateColor(e.target.value)} className="h-9 w-full rounded-lg border border-[#e8e2dc] cursor-pointer" /></div>
          </div>
          {createError && <p className="text-sm text-red-500">{createError}</p>}
        </div>
      </Modal>

      {/* Password modal */}
      <Modal open={showPassword} title={`Cambiar clave${ab ? " - " + ab.name : ""}`} onClose={() => { setShowPassword(false); setPasswordSaved(false); setNewPassword(""); }} footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary text-sm" onClick={() => setShowPassword(false)}>Cancelar</button>
          <button className="btn-primary text-sm" disabled={savingPassword || newPassword.length < 6} onClick={changePassword}>{savingPassword ? "Guardando..." : "Cambiar"}</button>
        </div>
      }>
        {passwordSaved ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-xl">&#x2713;</div>
            <p className="text-sm font-medium text-emerald-700">Clave actualizada</p>
          </div>
        ) : (
          <div><label className="field-label">Nueva clave (min 6)</label><input type="password" className="input-field" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoFocus /></div>
        )}
      </Modal>

      {/* Copy services modal */}
      <Modal
        open={showCopyServices}
        title={`Copiar servicios a ${ab?.name ?? ""}`}
        onClose={() => { setShowCopyServices(false); setCopyError(""); setCopySourceId(""); }}
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary text-sm" onClick={() => setShowCopyServices(false)}>Cancelar</button>
            <button className="btn-primary text-sm" onClick={copyServicesFrom} disabled={copying || !copySourceId}>
              {copying ? "Copiando..." : "Copiar asignación"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-stone-500">
            Selecciona un barbero y se copiarán sus servicios a {ab?.name ?? "este barbero"}.
            Los cambios no se guardan hasta que pulses &quot;Guardar&quot; arriba.
          </p>
          <div>
            <label className="field-label">Copiar desde</label>
            <select
              className="input-field"
              value={copySourceId}
              onChange={(e) => setCopySourceId(e.target.value)}
            >
              <option value="">-- Elige un barbero --</option>
              {barbers.filter((b) => b.id !== selectedBarber).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          {copyError && <p className="text-xs text-red-600">{copyError}</p>}
        </div>
      </Modal>

      {toast && <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white shadow-lg lg:bottom-6">{toast}</div>}
    </div>
  );
}
