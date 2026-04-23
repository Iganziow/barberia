"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import InfoTip from "@/components/ui/InfoTip";
import Modal from "@/components/ui/modal";
import UserAvatarBadge from "@/components/ui/UserAvatarBadge";
import { formatCLP } from "@/lib/format";
import { useQuickStats } from "@/hooks/use-quick-stats";

type Barber = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  color: string;
  active: boolean;
  commissionType: "PERCENTAGE" | "FIXED";
  commissionValue: number;
};
type ServiceOption = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  active: boolean;
};
type BarberServiceAssign = {
  serviceId: string;
  customPrice: number | null;
  customDuration: number | null;
};
type BarberDay = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorking: boolean;
};

const DAYS = [
  { dayOfWeek: 1, label: "Lunes" },
  { dayOfWeek: 2, label: "Martes" },
  { dayOfWeek: 3, label: "Miércoles" },
  { dayOfWeek: 4, label: "Jueves" },
  { dayOfWeek: 5, label: "Viernes" },
  { dayOfWeek: 6, label: "Sábado" },
  { dayOfWeek: 0, label: "Domingo" },
];

function initBarberSchedule(existing: BarberDay[]): BarberDay[] {
  return DAYS.map(({ dayOfWeek }) => {
    const found = existing.find((s) => s.dayOfWeek === dayOfWeek);
    return (
      found ?? {
        dayOfWeek,
        startTime: "09:00",
        endTime: "18:00",
        isWorking: dayOfWeek !== 0,
      }
    );
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function firstName(name: string) {
  return name.split(" ")[0] || name;
}

// ─── Icons ──────────────────────────────────────────────────────────────
function IconX() {
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconSave() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

// Menu "Copiar →" para clonar horario de un día a otros (reusa pattern de schedule)
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
      >
        Copiar →
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-lg border border-[#e8e2dc] bg-white shadow-xl py-1 text-sm">
          <button type="button" className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-brand/5 hover:text-brand transition" onClick={() => { onCopy(WEEKDAYS); setOpen(false); }}>
            Aplicar a Lun–Vie
          </button>
          <button type="button" className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-brand/5 hover:text-brand transition" onClick={() => { onCopy(WEEKEND); setOpen(false); }}>
            Aplicar a Sáb + Dom
          </button>
          <button type="button" className="w-full text-left px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-brand/5 hover:text-brand transition border-t border-[#f0ece8]" onClick={() => { onCopy(ALL); setOpen(false); }}>
            Aplicar a todos los días
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────
export default function BarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [allServices, setAllServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [innerTab, setInnerTab] = useState<"profile" | "services" | "commission" | "schedule">("profile");
  const [assignments, setAssignments] = useState<BarberServiceAssign[]>([]);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commissionType, setCommissionType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [commissionValue, setCommissionValue] = useState("0");
  const [savingCommission, setSavingCommission] = useState(false);
  const [commissionSaved, setCommissionSaved] = useState(false);

  // Profile form
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editColor, setEditColor] = useState("#c87941");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Password modal
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createColor, setCreateColor] = useState("#c87941");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Horario de trabajo del barbero
  const [barberSchedule, setBarberSchedule] = useState<BarberDay[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleLoadError, setScheduleLoadError] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [scheduleSaveError, setScheduleSaveError] = useState("");

  // Assignments error + copy modal
  const [assignError, setAssignError] = useState("");
  const [showCopyServices, setShowCopyServices] = useState(false);
  const [copySourceId, setCopySourceId] = useState<string>("");
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState("");

  const [toast, setToast] = useState<string | null>(null);
  function showToast(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  }

  // Ref al panel derecho para auto-scroll en mobile al seleccionar un barbero.
  // En desktop con grid 2-col no hace falta; en < md el panel aparece debajo
  // de la lista y conviene llevar al usuario ahí.
  const panelRef = useRef<HTMLElement | null>(null);

  // Stats del día (desde hook compartido — lo usa también la agenda)
  const quickStats = useQuickStats();

  // ─── Data fetching ─────────────────────────────────────────────────────
  const fetchData = useCallback(() => {
    Promise.all([
      fetch("/api/admin/barbers").then((r) => r.json()),
      fetch("/api/admin/services?all=true").then((r) => r.json()),
    ])
      .then(([bd, sd]) => {
        setBarbers(bd.barbers || []);
        setAllServices((sd.services || []).filter((s: ServiceOption) => s.active));
      })
      .catch(() => showToast("Error al cargar barberos. Revisa tu conexión."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function selectBarber(id: string) {
    setSelectedBarber(id);
    setInnerTab("profile");
    setProfileSaved(false);
    setProfileError("");
    setLoadingAssign(true);
    setAssignError("");
    // Reset del horario — se cargará perezosamente al entrar a la tab
    setBarberSchedule([]);
    setScheduleSaved(false);
    setScheduleLoadError("");
    setScheduleSaveError("");
    // En mobile llevar el viewport al panel para que el usuario vea el
    // resultado de la selección (md+ tiene 2 cols y no hace falta)
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      requestAnimationFrame(() => {
        panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    fetch(`/api/admin/barbers/${id}/services`)
      .then(async (r) => {
        if (!r.ok) throw new Error("No se pudieron cargar los servicios del barbero");
        return r.json();
      })
      .then((d) =>
        setAssignments(
          (d.services || []).map((s: BarberServiceAssign) => ({
            serviceId: s.serviceId,
            customPrice: s.customPrice,
            customDuration: s.customDuration,
          }))
        )
      )
      .catch((e: Error) => setAssignError(e.message || "Error de conexión"))
      .finally(() => setLoadingAssign(false));
    const b = barbers.find((x) => x.id === id);
    if (b) {
      setEditName(b.name);
      setEditEmail(b.email || "");
      setEditPhone(b.phone || "");
      setEditColor(b.color || "#c87941");
      setCommissionType(b.commissionType);
      setCommissionValue(String(b.commissionValue));
    }
  }

  async function saveProfile() {
    if (!selectedBarber) return;
    setSavingProfile(true);
    setProfileError("");
    setProfileSaved(false);
    const r = await fetch(`/api/admin/barbers/${selectedBarber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim() || null,
        color: editColor,
      }),
    });
    if (r.ok) {
      setProfileSaved(true);
      setBarbers((p) =>
        p.map((b) =>
          b.id === selectedBarber
            ? { ...b, name: editName.trim(), email: editEmail.trim(), phone: editPhone.trim() || null, color: editColor }
            : b
        )
      );
    } else {
      const d = await r.json().catch(() => ({ message: "Error" }));
      setProfileError(d.message);
    }
    setSavingProfile(false);
  }

  async function changePassword() {
    if (!selectedBarber || newPassword.length < 6) return;
    setSavingPassword(true);
    const r = await fetch(`/api/admin/barbers/${selectedBarber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    if (r.ok) {
      setPasswordSaved(true);
      setNewPassword("");
      setTimeout(() => {
        setShowPassword(false);
        setPasswordSaved(false);
      }, 1500);
    }
    setSavingPassword(false);
  }

  async function deactivateBarber(id: string) {
    if (!window.confirm("¿Desactivar este barbero? No aparecerá en el booking.")) return;
    try {
      const r = await fetch(`/api/admin/barbers/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({ message: "No se pudo desactivar" }));
        showToast(d.message || "No se pudo desactivar el barbero");
        return;
      }
      setBarbers((p) => p.filter((b) => b.id !== id));
      if (selectedBarber === id) setSelectedBarber(null);
      showToast("Barbero desactivado");
    } catch {
      showToast("Error de conexión al desactivar");
    }
  }

  async function createBarber() {
    setCreating(true);
    setCreateError("");
    const r = await fetch("/api/admin/barbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createName.trim(),
        email: createEmail.trim(),
        phone: createPhone.trim() || null,
        password: createPassword,
        color: createColor,
      }),
    });
    if (r.ok) {
      setShowCreate(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePhone("");
      setCreatePassword("");
      fetchData();
      showToast("Barbero creado");
    } else {
      const d = await r.json().catch(() => ({ message: "Error" }));
      setCreateError(d.message);
    }
    setCreating(false);
  }

  function toggleService(sid: string) {
    setAssignments((p) =>
      p.find((a) => a.serviceId === sid)
        ? p.filter((a) => a.serviceId !== sid)
        : [...p, { serviceId: sid, customPrice: null, customDuration: null }]
    );
  }

  async function saveAssignments() {
    if (!selectedBarber) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/barbers/${selectedBarber}/services`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services: assignments }),
      });
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
    const v = Number(commissionValue);
    if (Number.isNaN(v) || v < 0) {
      showToast("Valor de comisión inválido");
      return;
    }
    if (commissionType === "PERCENTAGE" && v > 100) {
      showToast("El porcentaje no puede superar 100%");
      return;
    }
    setSavingCommission(true);
    try {
      const r = await fetch(`/api/admin/barbers/${selectedBarber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionType, commissionValue: v }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({ message: "Error al guardar comisión" }));
        showToast(d.message || "Error al guardar comisión");
        return;
      }
      setBarbers((p) =>
        p.map((b) => (b.id === selectedBarber ? { ...b, commissionType, commissionValue: v } : b))
      );
      setCommissionSaved(true);
    } catch {
      showToast("Error de conexión");
    } finally {
      setSavingCommission(false);
    }
  }

  // ─── Horario de trabajo ──────────────────────────────────────────────
  function loadBarberSchedule(barberId: string) {
    setLoadingSchedule(true);
    setScheduleSaved(false);
    setScheduleLoadError("");
    fetch(`/api/admin/barbers/${barberId}/schedule`)
      .then(async (r) => {
        if (!r.ok) throw new Error("No se pudo cargar el horario");
        return r.json();
      })
      .then((d) => setBarberSchedule(initBarberSchedule(d.schedule || [])))
      .catch((e: Error) => setScheduleLoadError(e.message || "Error de conexión"))
      .finally(() => setLoadingSchedule(false));
  }

  function updateBarberDay(dayOfWeek: number, field: keyof BarberDay, value: string | boolean) {
    setBarberSchedule((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s))
    );
    setScheduleSaved(false);
  }

  function copyBarberDayTo(sourceDow: number, targetDows: number[]) {
    const source = barberSchedule.find((s) => s.dayOfWeek === sourceDow);
    if (!source) return;
    setBarberSchedule((prev) =>
      prev.map((s) =>
        targetDows.includes(s.dayOfWeek)
          ? { ...s, startTime: source.startTime, endTime: source.endTime, isWorking: true }
          : s
      )
    );
    setScheduleSaved(false);
  }

  const scheduleTimeErrors = barberSchedule
    .filter((s) => s.isWorking && s.startTime >= s.endTime)
    .map((s) => DAYS.find((d) => d.dayOfWeek === s.dayOfWeek)?.label);

  async function saveBarberSchedule() {
    if (!selectedBarber) return;
    if (scheduleTimeErrors.length > 0) return;
    setSavingSchedule(true);
    setScheduleSaveError("");
    try {
      const r = await fetch(`/api/admin/barbers/${selectedBarber}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: barberSchedule }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({ message: "Error al guardar" }));
        setScheduleSaveError(d.message || "No se pudo guardar el horario");
        return;
      }
      setScheduleSaved(true);
    } catch {
      setScheduleSaveError("Error de conexión");
    } finally {
      setSavingSchedule(false);
    }
  }

  async function copyServicesFrom() {
    if (!copySourceId || !selectedBarber) return;
    setCopying(true);
    setCopyError("");
    try {
      const r = await fetch(`/api/admin/barbers/${copySourceId}/services`);
      if (!r.ok) throw new Error("No se pudieron leer los servicios del barbero origen");
      const d = await r.json();
      const sourceServices: BarberServiceAssign[] = (d.services || []).map((s: BarberServiceAssign) => ({
        serviceId: s.serviceId,
        customPrice: s.customPrice,
        customDuration: s.customDuration,
      }));
      setAssignments(sourceServices);
      setShowCopyServices(false);
      setCopySourceId("");
      showToast(
        `Copiado desde ${barbers.find((b) => b.id === copySourceId)?.name ?? "otro barbero"}. Pulsa Guardar para aplicar.`
      );
    } catch (e) {
      setCopyError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setCopying(false);
    }
  }

  const ab = barbers.find((b) => b.id === selectedBarber);

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-[#e8e2dc]">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Barberos</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Gestiona tu equipo: perfiles, servicios y comisiones
          </p>
        </div>
        <div className="flex items-start gap-6 sm:gap-10 flex-wrap">
          {/* Stats inline */}
          <div className="flex items-start gap-6 sm:gap-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Activos</p>
              <p className="text-2xl font-extrabold text-stone-900 mt-0.5 tabular-nums">{barbers.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Citas hoy</p>
              <p className="text-2xl font-extrabold text-brand mt-0.5 tabular-nums">
                {quickStats?.appointmentCount ?? 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition shadow-sm shadow-brand/20"
            >
              <IconPlus />
              Nuevo barbero
            </button>
            <UserAvatarBadge />
          </div>
        </div>
      </div>

      {/* ── Loading ──────────────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] gap-5">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-stone-100 animate-pulse" />
            ))}
          </div>
          <div className="hidden md:block h-96 rounded-2xl bg-stone-100 animate-pulse" />
        </div>
      )}

      {/* ── Main grid ────────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] gap-5">
          {/* Left: barber list */}
          <aside className="space-y-2">
            {barbers.map((b) => {
              const isSelected = b.id === selectedBarber;
              return (
                <div
                  key={b.id}
                  className={`group relative flex items-center gap-3 rounded-2xl border p-3 transition-all ${
                    isSelected
                      ? "border-brand bg-brand/5 shadow-sm"
                      : "border-[#e8e2dc] bg-white hover:border-brand/40 hover:shadow-sm"
                  }`}
                >
                  <button
                    onClick={() => selectBarber(b.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                      style={{ backgroundColor: b.color || "#c87941" }}
                    >
                      {initials(b.name)}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm truncate ${isSelected ? "text-stone-900" : "text-stone-800"}`}>
                        {b.name}
                      </p>
                      <p className="text-[11px] text-brand truncate">{b.email}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => deactivateBarber(b.id)}
                    className="shrink-0 grid place-items-center h-7 w-7 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="Desactivar barbero"
                    aria-label="Desactivar barbero"
                  >
                    <IconX />
                  </button>
                </div>
              );
            })}
            {barbers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#e8e2dc] bg-white p-6 text-center">
                <p className="text-sm text-stone-500 font-medium">Sin barberos</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-2 text-xs text-brand font-semibold hover:text-brand-hover"
                >
                  + Agregar primer barbero
                </button>
              </div>
            )}
          </aside>

          {/* Right: panel — en mobile ocultamos el panel vacío para no
              agregar ruido debajo de la lista. En md+ mostramos el empty
              state porque el panel siempre tiene espacio reservado. */}
          <section
            ref={panelRef}
            className={`rounded-2xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden ${
              !selectedBarber ? "hidden md:block" : ""
            }`}
          >
            {!selectedBarber && (
              <div className="text-center py-16 px-5">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-stone-100 text-stone-400">
                  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <p className="text-sm text-stone-500 font-medium">Selecciona un barbero</p>
                <p className="text-xs text-stone-400 mt-1">
                  Elige uno de la lista para ver su perfil, servicios y comisión.
                </p>
              </div>
            )}

            {selectedBarber && ab && (
              <>
                {/* Tabs */}
                <div className="flex border-b border-[#e8e2dc] px-4 sm:px-6 gap-1 overflow-x-auto">
                  {(["profile", "services", "commission", "schedule"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setInnerTab(t);
                        setProfileSaved(false);
                        setCommissionSaved(false);
                        setScheduleSaved(false);
                        // Carga perezosa del horario solo cuando entran a la tab
                        if (t === "schedule" && selectedBarber && barberSchedule.length === 0) {
                          loadBarberSchedule(selectedBarber);
                        }
                      }}
                      className={`shrink-0 relative px-4 py-3 text-sm font-medium transition ${
                        innerTab === t
                          ? "text-brand"
                          : "text-stone-500 hover:text-stone-700"
                      }`}
                    >
                      {t === "profile"
                        ? "Perfil"
                        : t === "services"
                          ? "Servicios que hace"
                          : t === "commission"
                            ? "Comisión"
                            : "Horario"}
                      {innerTab === t && (
                        <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-brand rounded-t" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab body */}
                <div className="p-5 sm:p-6">
                  {/* ── Profile tab ── */}
                  {innerTab === "profile" && (
                    <div className="max-w-xl space-y-5">
                      <h2 className="font-bold text-stone-900">Perfil de {firstName(ab.name)}</h2>
                      <div className="space-y-4">
                        <div>
                          <label className="field-label">Nombre</label>
                          <input
                            className="input-field"
                            value={editName}
                            onChange={(e) => {
                              setEditName(e.target.value);
                              setProfileSaved(false);
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="field-label">Email</label>
                            <input
                              type="email"
                              className="input-field"
                              value={editEmail}
                              onChange={(e) => {
                                setEditEmail(e.target.value);
                                setProfileSaved(false);
                              }}
                            />
                          </div>
                          <div>
                            <label className="field-label">Teléfono</label>
                            <input
                              className="input-field"
                              value={editPhone}
                              onChange={(e) => {
                                setEditPhone(e.target.value);
                                setProfileSaved(false);
                              }}
                              placeholder="+56..."
                            />
                          </div>
                        </div>
                        <div>
                          <label className="field-label">Color en calendario</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={editColor}
                              onChange={(e) => {
                                setEditColor(e.target.value);
                                setProfileSaved(false);
                              }}
                              className="h-9 w-14 rounded-lg border border-[#e8e2dc] cursor-pointer p-0.5 bg-white"
                            />
                            <span className="text-xs text-stone-400 font-mono tabular-nums">{editColor}</span>
                          </div>
                        </div>
                      </div>
                      {profileError && <p className="text-sm text-red-600">{profileError}</p>}
                      <div className="pt-3 border-t border-[#f0ece8] flex items-center gap-3 flex-wrap">
                        <button onClick={saveProfile} disabled={savingProfile} className="btn-primary text-sm">
                          {savingProfile ? "Guardando..." : "Guardar perfil"}
                        </button>
                        <button onClick={() => setShowPassword(true)} className="btn-secondary text-sm">
                          Cambiar clave
                        </button>
                        {profileSaved && (
                          <span className="text-xs text-emerald-600 font-medium">✓ Guardado</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Services tab ── */}
                  {innerTab === "services" && (
                    <>
                      {loadingAssign ? (
                        <p className="text-stone-400 text-sm text-center py-8">Cargando...</p>
                      ) : assignError ? (
                        <div className="text-center py-8 space-y-2">
                          <p className="text-sm text-red-600">{assignError}</p>
                          <button
                            onClick={() => selectBarber(selectedBarber)}
                            className="text-xs font-semibold text-brand underline"
                          >
                            Reintentar
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h2 className="font-bold text-stone-900 flex items-center gap-1">
                              Servicios que hace {firstName(ab.name)}
                              <InfoTip text="Los servicios se crean en el menú Servicios. Aquí solo marcas cuáles ofrece este barbero." />
                            </h2>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowCopyServices(true)}
                                className="btn-secondary text-xs"
                                disabled={barbers.length < 2}
                                title={
                                  barbers.length < 2
                                    ? "Necesitas otro barbero para copiar"
                                    : "Copiar servicios desde otro barbero"
                                }
                              >
                                Copiar desde...
                              </button>
                              <button
                                onClick={saveAssignments}
                                disabled={saving}
                                className="btn-primary text-xs"
                              >
                                {saving ? "Guardando..." : "Guardar"}
                              </button>
                            </div>
                          </div>
                          {/* Banner de contexto: aclara de dónde vienen los servicios
                              y lleva al catálogo si falta crear alguno. */}
                          <div className="rounded-lg bg-brand/5 border border-brand/15 px-3 py-2 text-xs text-stone-600 flex items-start gap-2">
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-brand mt-0.5 shrink-0">
                              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 12H9v-2h2v2zm0-4H9V6h2v4z" />
                            </svg>
                            <p className="leading-snug">
                              Marca solo los servicios que {firstName(ab.name)} realiza.
                              {" "}
                              <Link href="/admin/services" className="font-semibold text-brand hover:text-brand-hover underline underline-offset-2">
                                ¿Falta algún servicio?
                              </Link>
                            </p>
                          </div>
                          <div className="rounded-xl border border-[#e8e2dc] divide-y divide-[#f0ece8]">
                            {allServices.map((svc) => {
                              const asgn = assignments.find((a) => a.serviceId === svc.id);
                              return (
                                <label
                                  key={svc.id}
                                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-stone-50/60 transition"
                                >
                                  <input
                                    type="checkbox"
                                    checked={!!asgn}
                                    onChange={() => toggleService(svc.id)}
                                    className="h-4 w-4 rounded accent-brand"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-stone-800">{svc.name}</p>
                                    <p className="text-xs text-stone-400 mt-0.5">
                                      {svc.durationMin} min · {formatCLP(svc.price)}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                            {allServices.length === 0 && (
                              <p className="text-sm text-stone-400 text-center py-8">
                                No hay servicios activos. Crea uno en Servicios.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── Schedule tab ── */}
                  {innerTab === "schedule" && (
                    <>
                      {loadingSchedule ? (
                        <p className="text-stone-400 text-sm text-center py-8">Cargando horario...</p>
                      ) : scheduleLoadError ? (
                        <div className="text-center py-8 space-y-2">
                          <p className="text-sm text-red-600">{scheduleLoadError}</p>
                          <button
                            onClick={() => loadBarberSchedule(selectedBarber)}
                            className="text-xs font-semibold text-brand underline"
                          >
                            Reintentar
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h2 className="font-bold text-stone-900">
                              Horario de trabajo de {firstName(ab.name)}
                            </h2>
                            <div className="flex items-center gap-3">
                              {scheduleSaved && (
                                <span className="text-xs text-emerald-600 font-semibold">✓ Guardado</span>
                              )}
                              <button
                                onClick={saveBarberSchedule}
                                disabled={savingSchedule || scheduleTimeErrors.length > 0}
                                className="inline-flex items-center gap-1.5 btn-primary text-xs disabled:opacity-50"
                              >
                                <IconSave />
                                {savingSchedule ? "Guardando..." : "Guardar"}
                              </button>
                            </div>
                          </div>

                          {/* Banner: debe caer dentro del horario de la sucursal */}
                          <div className="rounded-lg bg-brand/5 border border-brand/15 px-3 py-2 text-xs text-stone-600 flex items-start gap-2">
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-brand mt-0.5 shrink-0">
                              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 12H9v-2h2v2zm0-4H9V6h2v4z" />
                            </svg>
                            <p className="leading-snug">
                              El horario de {firstName(ab.name)} debe caer dentro del horario de la sucursal.{" "}
                              <Link
                                href="/admin/schedule"
                                className="font-semibold text-brand hover:text-brand-hover underline underline-offset-2"
                              >
                                Ver horario de la sucursal →
                              </Link>
                            </p>
                          </div>

                          {scheduleTimeErrors.length > 0 && (
                            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                              Entrada debe ser anterior a la salida en: {scheduleTimeErrors.join(", ")}
                            </div>
                          )}
                          {scheduleSaveError && (
                            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-center justify-between gap-2">
                              <span>{scheduleSaveError}</span>
                              <button
                                onClick={saveBarberSchedule}
                                className="text-xs font-semibold underline hover:no-underline shrink-0"
                              >
                                Reintentar
                              </button>
                            </div>
                          )}

                          <div className="rounded-xl border border-[#e8e2dc] divide-y divide-[#f0ece8] overflow-hidden">
                            {DAYS.map(({ dayOfWeek, label }) => {
                              const day = barberSchedule.find((s) => s.dayOfWeek === dayOfWeek);
                              if (!day) return null;
                              const off = !day.isWorking;
                              return (
                                <div
                                  key={dayOfWeek}
                                  className={`flex items-center gap-3 flex-wrap sm:flex-nowrap px-4 py-3.5 ${
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
                                      value={day.startTime}
                                      disabled={off}
                                      onChange={(e) => updateBarberDay(dayOfWeek, "startTime", e.target.value)}
                                      className="input-field text-sm w-[110px] sm:w-[120px] py-1.5 font-medium tabular-nums"
                                    />
                                    <span className="text-stone-400 text-xs">a</span>
                                    <input
                                      type="time"
                                      value={day.endTime}
                                      disabled={off}
                                      onChange={(e) => updateBarberDay(dayOfWeek, "endTime", e.target.value)}
                                      className="input-field text-sm w-[110px] sm:w-[120px] py-1.5 font-medium tabular-nums"
                                    />
                                  </div>
                                  {!off && (
                                    <div className="order-last sm:order-none ml-auto sm:ml-0 shrink-0">
                                      <CopyDayMenu
                                        sourceDow={dayOfWeek}
                                        onCopy={(targets) => copyBarberDayTo(dayOfWeek, targets)}
                                      />
                                    </div>
                                  )}
                                  <label className="flex items-center gap-2 cursor-pointer shrink-0 order-2 sm:order-none ml-auto sm:ml-0">
                                    <input
                                      type="checkbox"
                                      checked={day.isWorking}
                                      onChange={(e) => updateBarberDay(dayOfWeek, "isWorking", e.target.checked)}
                                      className="h-4 w-4 rounded border-stone-300 accent-brand"
                                    />
                                    <span
                                      className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                                        day.isWorking
                                          ? "bg-blue-50 text-blue-700"
                                          : "bg-stone-100 text-stone-400"
                                      }`}
                                    >
                                      {day.isWorking ? "Trabaja" : "Libre"}
                                    </span>
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── Commission tab ── */}
                  {innerTab === "commission" && (
                    <div className="max-w-md space-y-5">
                      <h2 className="font-bold text-stone-900 flex items-center">
                        Comisión de {firstName(ab.name)}
                        <InfoTip text="Se calcula en Reportes · Liquidaciones al final del período." />
                      </h2>
                      <div>
                        <label className="field-label">Tipo de comisión</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCommissionType("PERCENTAGE")}
                            className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition ${
                              commissionType === "PERCENTAGE"
                                ? "border-brand bg-brand/10 text-brand"
                                : "border-[#e8e2dc] bg-white text-stone-500 hover:border-stone-300"
                            }`}
                          >
                            Porcentaje (%)
                          </button>
                          <button
                            onClick={() => setCommissionType("FIXED")}
                            className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition ${
                              commissionType === "FIXED"
                                ? "border-brand bg-brand/10 text-brand"
                                : "border-[#e8e2dc] bg-white text-stone-500 hover:border-stone-300"
                            }`}
                          >
                            Fijo (CLP)
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="field-label">
                          {commissionType === "PERCENTAGE" ? "Porcentaje (0-100)" : "Monto por cita"}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={commissionType === "PERCENTAGE" ? "100" : undefined}
                          className="input-field"
                          value={commissionValue}
                          onChange={(e) => {
                            setCommissionValue(e.target.value);
                            setCommissionSaved(false);
                          }}
                        />
                        <p className="text-xs text-stone-500 mt-2">
                          {commissionType === "PERCENTAGE"
                            ? `Ejemplo: ${formatCLP(10000)} → ${formatCLP((10000 * Number(commissionValue || 0)) / 100)}`
                            : `${formatCLP(Number(commissionValue || 0))} fijo por cita`}
                        </p>
                      </div>
                      <div className="pt-3 border-t border-[#f0ece8] flex items-center gap-3 flex-wrap">
                        <button onClick={saveCommission} disabled={savingCommission} className="btn-primary text-sm">
                          {savingCommission ? "Guardando..." : "Guardar comisión"}
                        </button>
                        {commissionSaved && (
                          <span className="text-xs text-emerald-600 font-medium">✓ Guardado</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <Modal
        open={showCreate}
        title="Nuevo barbero"
        onClose={() => setShowCreate(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary text-sm" onClick={() => setShowCreate(false)}>
              Cancelar
            </button>
            <button
              className="btn-primary text-sm"
              disabled={creating || !createName.trim() || !createEmail.trim() || createPassword.length < 6}
              onClick={createBarber}
            >
              {creating ? "Creando..." : "Crear barbero"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="field-label">Nombre *</label>
            <input
              className="input-field"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Daniel Silva"
            />
          </div>
          <div>
            <label className="field-label">Email * (login)</label>
            <input
              type="email"
              className="input-field"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="daniel@barberia.cl"
            />
          </div>
          <div>
            <label className="field-label">Clave * (min 6)</label>
            <input
              type="password"
              className="input-field"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Teléfono</label>
              <input
                className="input-field"
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                placeholder="+56..."
              />
            </div>
            <div>
              <label className="field-label">Color</label>
              <input
                type="color"
                value={createColor}
                onChange={(e) => setCreateColor(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#e8e2dc] cursor-pointer p-0.5 bg-white"
              />
            </div>
          </div>
          {createError && <p className="text-sm text-red-500">{createError}</p>}
        </div>
      </Modal>

      <Modal
        open={showPassword}
        title={`Cambiar clave${ab ? " · " + ab.name : ""}`}
        onClose={() => {
          setShowPassword(false);
          setPasswordSaved(false);
          setNewPassword("");
        }}
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary text-sm" onClick={() => setShowPassword(false)}>
              Cancelar
            </button>
            <button
              className="btn-primary text-sm"
              disabled={savingPassword || newPassword.length < 6}
              onClick={changePassword}
            >
              {savingPassword ? "Guardando..." : "Cambiar"}
            </button>
          </div>
        }
      >
        {passwordSaved ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-xl">
              ✓
            </div>
            <p className="text-sm font-medium text-emerald-700">Clave actualizada</p>
          </div>
        ) : (
          <div>
            <label className="field-label">Nueva clave (min 6)</label>
            <input
              type="password"
              className="input-field"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
            />
          </div>
        )}
      </Modal>

      <Modal
        open={showCopyServices}
        title={`Copiar servicios a ${ab?.name ?? ""}`}
        onClose={() => {
          setShowCopyServices(false);
          setCopyError("");
          setCopySourceId("");
        }}
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary text-sm" onClick={() => setShowCopyServices(false)}>
              Cancelar
            </button>
            <button
              className="btn-primary text-sm"
              onClick={copyServicesFrom}
              disabled={copying || !copySourceId}
            >
              {copying ? "Copiando..." : "Copiar asignación"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-stone-500">
            Selecciona un barbero y se copiarán sus servicios a {ab?.name ?? "este barbero"}. Los
            cambios no se guardan hasta que pulses &quot;Guardar&quot; arriba.
          </p>
          <div>
            <label className="field-label">Copiar desde</label>
            <select
              className="input-field"
              value={copySourceId}
              onChange={(e) => setCopySourceId(e.target.value)}
            >
              <option value="">-- Elige un barbero --</option>
              {barbers
                .filter((b) => b.id !== selectedBarber)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </div>
          {copyError && <p className="text-xs text-red-600">{copyError}</p>}
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white shadow-lg lg:bottom-6">
          {toast}
        </div>
      )}
    </div>
  );
}
