"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { formatCLP } from "@/lib/format";

type Service = { id: string; name: string; durationMin: number; price: number; category: string | null };
type BarberAvail = { id: string; name: string; color: string | null; availableSlots: number };
type Slot = { start: string; end: string };
type Step = "service" | "barber" | "datetime" | "confirm";
type HeatmapDay = { date: string; totalSlots: number; availableSlots: number; level: string; waitlistCount: number };

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}

function getDateOptions() {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

const STEPS: { key: Step; label: string }[] = [
  { key: "service", label: "Servicio" },
  { key: "barber", label: "Profesional" },
  { key: "datetime", label: "Horario" },
  { key: "confirm", label: "Confirmar" },
];

export default function BookingPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    document.cookie = `bb_org=${slug};path=/;max-age=${60 * 60 * 24 * 30}`;
  }, [slug]);

  const [step, setStep] = useState<Step>("service");
  const [branchId, setBranchId] = useState("");
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<BarberAvail | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<BarberAvail[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // Filtro de rango horario para el paso 3 (selección de hora)
  type TimePreset = "all" | "morning" | "afternoon" | "evening";
  const [timePreset, setTimePreset] = useState<TimePreset>("all");

  const TIME_PRESETS: { key: TimePreset; label: string; icon: string; from: number; to: number }[] = [
    { key: "all", label: "Todo el día", icon: "☀️", from: 0, to: 24 },
    { key: "morning", label: "Mañana", icon: "🌅", from: 7, to: 12 },
    { key: "afternoon", label: "Tarde", icon: "☀️", from: 12, to: 18 },
    { key: "evening", label: "Noche", icon: "🌙", from: 18, to: 23 },
  ];

  const filteredSlots = slots.filter((s) => {
    if (timePreset === "all") return true;
    const preset = TIME_PRESETS.find((p) => p.key === timePreset);
    if (!preset) return true;
    const hour = new Date(s.start).getHours();
    return hour >= preset.from && hour < preset.to;
  });

  useEffect(() => {
    fetch(`/api/book/services?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => setServices(d.services || []))
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    fetch(`/api/book/branches?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => { if (d.branches?.[0]) setBranchId(d.branches[0].id); })
      .catch(() => {});
  }, [slug]);

  // Computed values for multi-service
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const primaryService = selectedServices[0] || null;

  function toggleService(svc: Service) {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === svc.id);
      if (exists) return prev.filter((s) => s.id !== svc.id);
      if (prev.length >= 2) return prev; // max 2
      return [...prev, svc];
    });
  }

  function confirmServices() {
    if (selectedServices.length === 0) return;
    setSelectedBarber(null);
    setSelectedSlot(null);
    setSelectedDate("");
    setWaitlistSubmitted(false);
    setWaitlistPosition(null);
    setStep("barber");
    // Load heatmap for date picker
    if (branchId && selectedServices[0]) {
      fetch(`/api/book/heatmap?branchId=${branchId}&serviceId=${selectedServices[0].id}&days=14&slug=${slug}`)
        .then((r) => r.ok ? r.json() : { heatmap: [] })
        .then((d) => setHeatmap(d.heatmap || []))
        .catch(() => {});
    }
  }

  async function handleJoinWaitlist() {
    if (!primaryService || !selectedDate || !branchId || !clientName.trim() || !clientPhone.trim()) return;
    setWaitlistLoading(true);
    try {
      const res = await fetch(`/api/book/waitlist?slug=${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          serviceId: primaryService.id,
          barberId: selectedBarber?.id || "",
          preferredDate: selectedDate,
          branchId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setWaitlistSubmitted(true);
        setWaitlistPosition(data.position);
      }
    } catch { /* ignore */ }
    finally { setWaitlistLoading(false); }
  }

  function loadBarbers(serviceId: string, date: string, branch: string) {
    setLoading(true);
    fetch(`/api/book/availability?serviceId=${serviceId}&date=${date}&branchId=${branch}&slug=${slug}`)
      .then((r) => r.json())
      .then((d) => setBarbers(d.barbers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function loadSlots(serviceId: string, date: string, barber: string) {
    setLoading(true);
    fetch(`/api/book/availability?serviceId=${serviceId}&date=${date}&barberId=${barber}&slug=${slug}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSelectedBarber(null);
    setSelectedSlot(null);
    if (primaryService && branchId) loadBarbers(primaryService.id, date, branchId);
  }

  function handleSelectBarber(barber: BarberAvail) {
    setSelectedBarber(barber);
    setSelectedSlot(null);
    setStep("datetime");
    if (primaryService && selectedDate) loadSlots(primaryService.id, selectedDate, barber.id);
  }

  function handleSelectSlot(slot: Slot) {
    setSelectedSlot(slot);
    setStep("confirm");
  }

  async function handleSubmit() {
    if (selectedServices.length === 0 || !selectedBarber || !selectedSlot || !clientName.trim() || !clientPhone.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/book?slug=${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: primaryService!.id,
          barberId: selectedBarber.id,
          branchId,
          start: selectedSlot.start,
          end: selectedSlot.end,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientEmail: clientEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Error al reservar"); setSubmitting(false); return; }
      router.push(`/${slug}/book/confirmation?id=${data.booking.id}`);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setSubmitting(false);
    }
  }

  const dateOptions = getDateOptions();
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-[#faf8f6]">
      {/* Header */}
      <header className="bg-[#1a1412] text-white">
        <div className="mx-auto max-w-lg px-4 py-4 flex items-center justify-between">
          <Link href={`/${slug}`} className="text-lg font-extrabold tracking-tight">
            {slug}
          </Link>
          <span className="text-xs text-white/40">Reservar hora</span>
        </div>
      </header>

      {/* Progress steps */}
      <div className="mx-auto max-w-lg px-4 pt-5 pb-3">
        <div className="flex items-center">
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      done
                        ? "bg-gradient-to-br from-brand to-[#b56a35] text-white shadow-md shadow-brand/25"
                        : active
                          ? "bg-white text-brand ring-2 ring-brand shadow-[0_0_0_4px_rgba(200,121,65,0.12)]"
                          : "bg-stone-100 text-stone-400 border border-stone-200"
                    }`}
                  >
                    {done ? (
                      <svg className="step-pop h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <p className={`text-[10px] mt-2 font-semibold tracking-wide ${active ? "text-brand" : done ? "text-stone-700" : "text-stone-300"}`}>
                    {s.label}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="h-0.5 flex-1 rounded-full -mt-5 mx-1 bg-stone-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        i < stepIndex ? "w-full bg-gradient-to-r from-brand to-[#b56a35]" : "w-0"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <main className="mx-auto max-w-lg px-4 pb-12">
        {/* Step 1: Service selection (1-2 services) */}
        {step === "service" && (
          <div className="space-y-3 pt-2">
            <div>
              <h2 className="text-base font-bold text-stone-900">Elige tus servicios</h2>
              <p className="text-xs text-stone-400 mt-0.5">Puedes seleccionar hasta 2 servicios</p>
            </div>
            {services.length === 0 && (
              <p className="text-sm text-stone-400 py-8 text-center">Cargando servicios...</p>
            )}
            {services.map((svc) => {
              const isSelected = selectedServices.some((s) => s.id === svc.id);
              const isDisabled = !isSelected && selectedServices.length >= 2;
              return (
                <button
                  key={svc.id}
                  onClick={() => toggleService(svc)}
                  disabled={isDisabled}
                  className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-brand bg-gradient-to-br from-brand/10 via-brand/5 to-white ring-1 ring-brand/30 shadow-md shadow-brand/10"
                      : "border-[#e8e2dc] bg-white hover:border-brand/40 hover:shadow-md hover:-translate-y-0.5"
                  } ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                      isSelected ? "border-brand bg-brand" : "border-stone-300"
                    }`}>
                      {isSelected && (
                        <svg className="h-3 w-3 text-white step-pop" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-800">{svc.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                          <svg width="9" height="9" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .2.08.39.22.53l3 3a.75.75 0 101.06-1.06L10.75 9.69V5z" clipRule="evenodd" /></svg>
                          {svc.durationMin} min
                        </span>
                      </div>
                    </div>
                    <p className="font-extrabold text-brand text-lg shrink-0 tracking-tight">{formatCLP(svc.price)}</p>
                  </div>
                </button>
              );
            })}

            {/* Summary + Continue */}
            {selectedServices.length > 0 && (
              <div className="sticky bottom-0 bg-[#faf8f6] pt-3 pb-2 border-t border-[#e8e2dc] -mx-4 px-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-stone-600">
                      {selectedServices.length} servicio{selectedServices.length > 1 ? "s" : ""} · {totalDuration} min
                    </p>
                    <p className="text-lg font-bold text-brand">{formatCLP(totalPrice)}</p>
                  </div>
                  <button
                    onClick={confirmServices}
                    className="rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition shadow-lg shadow-brand/20"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Date + Barber */}
        {step === "barber" && selectedServices.length > 0 && (
          <div className="space-y-4 pt-2">
            <button onClick={() => setStep("service")} className="text-xs text-brand hover:text-brand-hover font-medium">
              ← Cambiar servicios
            </button>

            <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-2.5">
              {selectedServices.map((svc) => (
                <div key={svc.id} className="flex justify-between items-center py-0.5">
                  <span className="text-sm text-stone-800">{svc.name}</span>
                  <span className="text-xs text-stone-500">{formatCLP(svc.price)}</span>
                </div>
              ))}
              {selectedServices.length > 1 && (
                <div className="flex justify-between items-center pt-1 mt-1 border-t border-brand/10">
                  <span className="text-xs font-medium text-stone-600">Total · {totalDuration} min</span>
                  <span className="text-sm font-bold text-brand">{formatCLP(totalPrice)}</span>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-base font-bold text-stone-900 mb-3">Elige una fecha</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {dateOptions.map((date) => {
                  const d = new Date(date + "T12:00:00");
                  const isSelected = date === selectedDate;
                  const dayName = d.toLocaleDateString("es-CL", { weekday: "short" });
                  const dayNum = d.getDate();
                  const isToday = date === new Date().toISOString().split("T")[0];
                  const hm = heatmap.find((h) => h.date === date);
                  const dotColor =
                    !hm || hm.level === "closed" ? "bg-stone-300"
                    : hm.level === "full" ? "bg-red-400"
                    : hm.level === "low" ? "bg-amber-400"
                    : hm.level === "medium" ? "bg-yellow-400"
                    : "bg-emerald-400";

                  return (
                    <button
                      key={date}
                      onClick={() => handleSelectDate(date)}
                      className={`flex-shrink-0 w-14 rounded-xl border p-2 text-center transition ${
                        isSelected
                          ? "border-brand bg-brand text-white"
                          : hm?.level === "closed"
                            ? "border-[#e8e2dc] bg-stone-50 opacity-50"
                            : "border-[#e8e2dc] bg-white hover:border-brand/30"
                      }`}
                      disabled={hm?.level === "closed"}
                    >
                      <p className={`text-[10px] uppercase ${isSelected ? "text-white/70" : "text-stone-400"}`}>
                        {isToday ? "Hoy" : dayName}
                      </p>
                      <p className="text-lg font-bold leading-tight">{dayNum}</p>
                      {/* Heatmap dot */}
                      <div className="flex justify-center mt-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white/60" : dotColor}`} />
                      </div>
                      {hm && hm.level !== "closed" && (
                        <p className={`text-[8px] mt-0.5 ${isSelected ? "text-white/60" : "text-stone-400"}`}>
                          {hm.availableSlots > 0 ? hm.availableSlots : "Lleno"}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDate && (
              <div>
                <h2 className="text-base font-bold text-stone-900 mb-3">Elige un profesional</h2>
                {loading ? (
                  <p className="text-stone-400 text-sm py-4 text-center">Cargando disponibilidad...</p>
                ) : barbers.length === 0 ? (
                  <p className="text-stone-500 text-sm py-4 text-center">No hay disponibilidad para esta fecha</p>
                ) : (
                  <div className="space-y-2">
                    {barbers.map((b) => {
                      const initials = b.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
                      return (
                        <button
                          key={b.id}
                          onClick={() => handleSelectBarber(b)}
                          disabled={b.availableSlots === 0}
                          className="w-full rounded-xl border border-[#e8e2dc] bg-white p-3.5 text-left hover:border-brand/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                              style={{ backgroundColor: b.color || "#c87941" }}
                            >
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-stone-800 text-sm">{b.name}</p>
                              <p className="text-xs text-stone-400">
                                {b.availableSlots > 0
                                  ? `${b.availableSlots} horario${b.availableSlots !== 1 ? "s" : ""} disponible${b.availableSlots !== 1 ? "s" : ""}`
                                  : "Sin disponibilidad"}
                              </p>
                            </div>
                            {b.availableSlots > 0 && (
                              <svg className="h-4 w-4 text-stone-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Time slot */}
        {step === "datetime" && primaryService && selectedBarber && selectedDate && (
          <div className="space-y-4 pt-2">
            <button onClick={() => setStep("barber")} className="text-xs text-brand hover:text-brand-hover font-medium">
              ← Cambiar profesional
            </button>

            <div className="rounded-xl border border-[#e8e2dc] bg-white px-4 py-3">
              <p className="text-sm font-semibold text-stone-800">
                {selectedServices.map((s) => s.name).join(" + ")} con {selectedBarber.name}
              </p>
              <p className="text-xs text-stone-400 mt-0.5 capitalize">{formatDate(selectedDate)}</p>
            </div>

            <h2 className="text-base font-bold text-stone-900">Elige un horario</h2>

            {/* Filtro de rango horario */}
            {slots.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {TIME_PRESETS.map((p) => {
                  const count = slots.filter((s) => {
                    if (p.key === "all") return true;
                    const h = new Date(s.start).getHours();
                    return h >= p.from && h < p.to;
                  }).length;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setTimePreset(p.key)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition border ${
                        timePreset === p.key
                          ? "bg-brand text-white border-brand shadow-sm"
                          : "bg-white text-stone-600 border-[#e8e2dc] hover:border-brand/40"
                      }`}
                    >
                      <span className="mr-1">{p.icon}</span>
                      {p.label}
                      <span className={`ml-1.5 text-[10px] ${timePreset === p.key ? "text-white/70" : "text-stone-400"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {loading ? (
              <p className="text-stone-400 text-sm py-4 text-center">Cargando horarios...</p>
            ) : slots.length === 0 ? (
              <div className="rounded-xl border border-[#e8e2dc] bg-white p-5 text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-amber-50">
                  <svg width="24" height="24" fill="none" stroke="#F59E0B" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                </div>
                <p className="text-sm font-bold text-stone-800">Este día está lleno</p>
                <p className="text-xs text-stone-400 mt-1 mb-4">Todos los horarios están ocupados para esta fecha</p>

                {waitlistSubmitted ? (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <p className="text-sm font-bold text-emerald-700">Te anotamos en la lista de espera</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Posición #{waitlistPosition} — Te contactaremos si se libera un horario</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-stone-500">Anótate y te avisamos si se libera un horario:</p>
                    <input
                      className="input-field text-sm"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Tu nombre *"
                    />
                    <input
                      className="input-field text-sm"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Tu teléfono *"
                    />
                    <button
                      onClick={handleJoinWaitlist}
                      disabled={waitlistLoading || !clientName.trim() || !clientPhone.trim()}
                      className="w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-hover transition disabled:opacity-50"
                    >
                      {waitlistLoading ? "Anotando..." : "Anotarme en lista de espera"}
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setStep("barber")}
                  className="mt-3 text-xs text-stone-400 hover:text-brand"
                >
                  Probar otra fecha o profesional
                </button>
              </div>
            ) : filteredSlots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#e8e2dc] bg-white/50 p-5 text-center">
                <p className="text-sm text-stone-500">Sin horarios en este rango</p>
                <button
                  type="button"
                  onClick={() => setTimePreset("all")}
                  className="mt-2 text-xs text-brand hover:text-brand-hover font-medium"
                >
                  Ver todos los horarios
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {filteredSlots.map((slot) => (
                  <button
                    key={slot.start}
                    onClick={() => handleSelectSlot(slot)}
                    className="rounded-lg border border-[#e8e2dc] bg-white px-2 py-2.5 text-center text-sm font-semibold text-stone-700 hover:border-brand hover:bg-brand/5 hover:text-brand transition tabular-nums"
                  >
                    {formatSlotTime(slot.start)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === "confirm" && primaryService && selectedBarber && selectedSlot && (
          <div className="space-y-4 pt-2">
            <button onClick={() => setStep("datetime")} className="text-xs text-brand hover:text-brand-hover font-medium">
              ← Cambiar horario
            </button>

            {/* Summary card */}
            <div className="rounded-xl border border-[#e8e2dc] bg-white overflow-hidden">
              <div className="bg-[#1a1412] px-4 py-3">
                <p className="text-xs font-medium text-white/50 uppercase tracking-wide">Resumen de tu reserva</p>
              </div>
              <div className="p-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Servicio{selectedServices.length > 1 ? "s" : ""}</span>
                  <span className="font-medium text-stone-800 text-right">{selectedServices.map((s) => s.name).join(" + ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Profesional</span>
                  <span className="font-medium text-stone-800">{selectedBarber.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Fecha</span>
                  <span className="font-medium text-stone-800 capitalize">{formatDate(selectedDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Hora</span>
                  <span className="font-medium text-stone-800">{formatSlotTime(selectedSlot.start)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Duración</span>
                  <span className="font-medium text-stone-800">{totalDuration} min</span>
                </div>
                <div className="flex justify-between border-t border-[#e8e2dc] pt-2.5">
                  <span className="text-stone-500">Total</span>
                  <span className="text-lg font-bold text-brand">{formatCLP(totalPrice)}</span>
                </div>
              </div>
            </div>

            {/* Client info */}
            <div className="rounded-xl border border-[#e8e2dc] bg-white p-4 space-y-3">
              <h2 className="text-sm font-bold text-stone-800">Tus datos</h2>
              <div>
                <label className="field-label">Nombre completo *</label>
                <input className="input-field" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Tu nombre" />
              </div>
              <div>
                <label className="field-label">Teléfono *</label>
                <input className="input-field" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+56 9 1234 5678" type="tel" />
              </div>
              <div>
                <label className="field-label">Email (opcional)</label>
                <input className="input-field" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="tu@email.cl" type="email" />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !clientName.trim() || !clientPhone.trim()}
              className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-brand/20"
            >
              {submitting ? "Reservando..." : "Confirmar reserva"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
