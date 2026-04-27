"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { formatCLP } from "@/lib/format";
import {
  formatChileanPhone,
  isValidChileanPhone,
  normalizeChileanLocal,
  toE164ChileanPhone,
} from "@/lib/phone";

// ─── Tipos ──────────────────────────────────────────────────────────
type Service = { id: string; name: string; durationMin: number; price: number; category: string | null };
type BarberAvail = { id: string; name: string; color: string | null; availableSlots: number };
type Slot = { start: string; end: string };
type HeatmapDay = { date: string; totalSlots: number; availableSlots: number; level: string; waitlistCount: number };
type WorkingHour = { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string };
type BranchInfo = {
  name: string;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  orgName: string | null;
  orgDescription: string | null;
  orgLogo: string | null;
  workingHours: WorkingHour[];
};
type Branch = { id: string; name: string; address: string | null };
const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
/** Vista interna — todo en una sola URL para no perder estado al navegar. */
type View = "express" | "confirm";

const ANY_BARBER_ID = "__any__";
const TIME_PERIODS = [
  { key: "morning", label: "Mañana", icon: "🌅", from: 7, to: 12 },
  { key: "afternoon", label: "Tarde", icon: "☀️", from: 12, to: 18 },
  { key: "evening", label: "Noche", icon: "🌙", from: 18, to: 23 },
] as const;

// ─── Helpers de UI ──────────────────────────────────────────────────
function fmtSlot(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}
function fmtDayLong(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-CL", {
    weekday: "long", day: "numeric", month: "long",
  });
}
function getDateOptions(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    out.push(d.toISOString().split("T")[0]);
  }
  return out;
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function heatColor(level?: string): string {
  if (!level || level === "closed") return "var(--mb-heat-closed)";
  if (level === "full") return "var(--mb-heat-full)";
  if (level === "low") return "var(--mb-heat-low)";
  if (level === "medium") return "var(--mb-heat-medium)";
  return "var(--mb-heat-high)";
}

// ─── Iconos inline ───────────────────────────────────────────────────
function IconPin(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconChevDown(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M19 9l-7 7-7-7" />
    </svg>
  );
}
function IconArrow(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
function IconCheck(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
function IconBell(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
    </svg>
  );
}
function IconBack(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function IconClock(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
    </svg>
  );
}
function IconWhatsApp(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.126 1.524 5.867L.05 23.308a.75.75 0 00.892.892l5.441-1.474A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════
// Página principal
// ════════════════════════════════════════════════════════════════════
export default function BookingPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();

  // Cookie tenant
  useEffect(() => {
    document.cookie = `bb_org=${slug};path=/;max-age=${60 * 60 * 24 * 30}`;
  }, [slug]);

  // ── State principal ───────────────────────────────────────────────
  const [view, setView] = useState<View>("express");
  const [orgNotFound, setOrgNotFound] = useState(false);
  /** Toggle del horario semanal en el hero del negocio. */
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Tenant + sucursales
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);

  // Servicios disponibles
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  // Selección del usuario
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedBarber, setSelectedBarber] = useState<BarberAvail | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [clientNote, setClientNote] = useState("");

  // Datos derivados
  const [barbers, setBarbers] = useState<BarberAvail[]>([]);
  const [barbersLoading, setBarbersLoading] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  /** Mapeo start→barberId real cuando "any" está activo. */
  const [slotBarberMap, setSlotBarberMap] = useState<Record<string, string>>({});
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);

  // Form de cliente (paso "confirm")
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [agree, setAgree] = useState(true);

  // Submit + waitlist
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const dateOptions = useMemo(() => getDateOptions(), []);

  // ── Selección derivada ────────────────────────────────────────────
  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || null,
    [services, selectedServiceId]
  );
  const dayHeat = useMemo(
    () => heatmap.find((h) => h.date === selectedDate),
    [heatmap, selectedDate]
  );
  const ready = !!(selectedService && selectedBarber && selectedSlot && branchId);

  // ── Loaders ───────────────────────────────────────────────────────
  // Fetch sucursales + info del local
  useEffect(() => {
    fetch(`/api/book/branches?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => {
        const list: Branch[] = d.branches || [];
        setBranches(list);
        if (list.length === 1) setBranchId(list[0].id);
      })
      .catch(() => {});
    fetch(`/api/book/info?slug=${slug}`)
      .then((r) => {
        if (r.status === 404) { setOrgNotFound(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then((d) => {
        if (d?.branch) {
          setBranchInfo({
            name: d.branch.name,
            address: d.branch.address ?? null,
            phone: d.branch.phone ?? null,
            latitude: d.branch.latitude ?? null,
            longitude: d.branch.longitude ?? null,
            orgName: d.branch.orgName ?? null,
            orgDescription: d.branch.orgDescription ?? null,
            orgLogo: d.branch.orgLogo ?? null,
            workingHours: d.branch.workingHours ?? [],
          });
        }
      })
      .catch(() => {});
  }, [slug]);

  // Fetch servicios (filtrados a los que tienen al menos 1 barbero)
  useEffect(() => {
    fetch(`/api/book/services?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => setServices(d.services || []))
      .catch(() => {})
      .finally(() => setServicesLoading(false));
  }, [slug]);

  // Cuando cambia servicio o sucursal: cargar heatmap + reset selecciones derivadas
  useEffect(() => {
    if (!selectedServiceId || !branchId) {
      setHeatmap([]);
      return;
    }
    fetch(`/api/book/heatmap?branchId=${branchId}&serviceId=${selectedServiceId}&days=14&slug=${slug}`)
      .then((r) => r.ok ? r.json() : { heatmap: [] })
      .then((d) => setHeatmap(d.heatmap || []))
      .catch(() => {});
    // Reset cuando cambia servicio
    setSelectedBarber(null);
    setSelectedSlot(null);
    setSelectedDate("");
    setBarbers([]);
    setSlots([]);
    setWaitlistSubmitted(false);
    setWaitlistPosition(null);
  }, [selectedServiceId, branchId, slug]);

  // Cuando cambia fecha o servicio: cargar lista de barberos disponibles
  useEffect(() => {
    if (!selectedDate || !selectedServiceId || !branchId) {
      setBarbers([]);
      return;
    }
    setBarbersLoading(true);
    fetch(`/api/book/availability?serviceId=${selectedServiceId}&date=${selectedDate}&branchId=${branchId}&slug=${slug}`)
      .then((r) => r.json())
      .then((d) => {
        const list: BarberAvail[] = d.barbers || [];
        setBarbers(list);
      })
      .catch(() => {})
      .finally(() => setBarbersLoading(false));
  }, [selectedDate, selectedServiceId, branchId, slug]);

  // Cuando cambia barbero+fecha: cargar slots
  useEffect(() => {
    if (!selectedBarber || !selectedDate || !selectedServiceId) {
      setSlots([]);
      setSlotBarberMap({});
      return;
    }
    setSlotsLoading(true);
    setSlotBarberMap({});

    if (selectedBarber.id === ANY_BARBER_ID) {
      // Modo "cualquier disponible": fetch en paralelo de todos los barberos con cupos
      const eligible = barbers.filter((b) => b.availableSlots > 0);
      eligible.sort((a, b) => b.availableSlots - a.availableSlots);
      Promise.all(
        eligible.map((b) =>
          fetch(`/api/book/availability?serviceId=${selectedServiceId}&date=${selectedDate}&barberId=${b.id}&slug=${slug}`)
            .then((r) => r.ok ? r.json() : { slots: [] })
            .then((d) => ({ barberId: b.id, slots: (d.slots || []) as Slot[] }))
            .catch(() => ({ barberId: b.id, slots: [] as Slot[] }))
        )
      )
        .then((responses) => {
          const map: Record<string, string> = {};
          const merged: Slot[] = [];
          for (const r of responses) {
            for (const s of r.slots) {
              if (!map[s.start]) {
                map[s.start] = r.barberId;
                merged.push(s);
              }
            }
          }
          merged.sort((a, b) => a.start.localeCompare(b.start));
          setSlots(merged);
          setSlotBarberMap(map);
        })
        .finally(() => setSlotsLoading(false));
    } else {
      fetch(`/api/book/availability?serviceId=${selectedServiceId}&date=${selectedDate}&barberId=${selectedBarber.id}&slug=${slug}`)
        .then((r) => r.json())
        .then((d) => setSlots(d.slots || []))
        .catch(() => {})
        .finally(() => setSlotsLoading(false));
    }
  }, [selectedBarber, selectedDate, selectedServiceId, barbers, slug]);

  // ── Acciones ──────────────────────────────────────────────────────
  function pickService(svcId: string) {
    setSelectedServiceId((prev) => (prev === svcId ? "" : svcId));
  }
  function pickBranch(bId: string) {
    setBranchId(bId);
    setSelectedServiceId("");
    setSelectedBarber(null);
    setSelectedDate("");
    setSelectedSlot(null);
    setHeatmap([]);
  }
  function pickBarber(b: BarberAvail | "any") {
    if (b === "any") {
      const total = barbers.reduce((sum, x) => sum + x.availableSlots, 0);
      setSelectedBarber({ id: ANY_BARBER_ID, name: "Cualquier disponible", color: null, availableSlots: total });
    } else {
      setSelectedBarber(b);
    }
    setSelectedSlot(null);
  }
  function pickDate(d: string) {
    setSelectedDate(d);
    setSelectedBarber(null);
    setSelectedSlot(null);
  }
  function pickSlot(s: Slot) {
    if (selectedBarber?.id === ANY_BARBER_ID) {
      const realBarberId = slotBarberMap[s.start];
      const real = barbers.find((b) => b.id === realBarberId);
      if (real) setSelectedBarber(real);
    }
    setSelectedSlot(s);
  }

  async function handleJoinWaitlist() {
    if (!selectedService || !selectedDate || !branchId || !clientName.trim()) return;
    if (!isValidChileanPhone(clientPhone)) {
      setPhoneTouched(true);
      return;
    }
    setWaitlistLoading(true);
    try {
      const res = await fetch(`/api/book/waitlist?slug=${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: toE164ChileanPhone(clientPhone),
          serviceId: selectedService.id,
          barberId: selectedBarber?.id === ANY_BARBER_ID ? "" : selectedBarber?.id || "",
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

  async function handleConfirm() {
    if (!ready || !selectedService || !selectedBarber || !selectedSlot) return;
    if (selectedBarber.id === ANY_BARBER_ID) {
      setError("Selecciona un horario para asignar el profesional.");
      return;
    }
    const phoneE164 = toE164ChileanPhone(clientPhone);
    if (!phoneE164) {
      setPhoneTouched(true);
      setError("Revisa el teléfono. Debe ser un número chileno válido.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/book?slug=${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          barberId: selectedBarber.id,
          branchId,
          start: selectedSlot.start,
          end: selectedSlot.end,
          clientName: clientName.trim(),
          clientPhone: phoneE164,
          clientEmail: clientEmail.trim() || undefined,
          notePublic: clientNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Race condition (slot tomado mientras llenaba el form): volvemos a Express
        // y refrescamos slots para que vea las opciones que quedan.
        if (res.status === 409) {
          setError(`${data.message || "Este horario ya no está disponible."} Te volvimos a la pantalla anterior con horarios actualizados.`);
          setSelectedSlot(null);
          setView("express");
        } else {
          setError(data.message || "Error al reservar");
        }
        setSubmitting(false);
        return;
      }
      router.push(`/${slug}/book/confirmation?id=${data.booking.id}`);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setSubmitting(false);
    }
  }

  // ── 404 si el slug no existe ───────────────────────────────────────
  if (orgNotFound) {
    return (
      <div className="bk bk-state">
        <div className="bk-state__icon">
          <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" /><path d="M9 9l6 6M15 9l-6 6" />
          </svg>
        </div>
        <h1 className="bk-state__h">Negocio no encontrado</h1>
        <p className="bk-state__p">
          El link <strong>/{slug}</strong> no existe o ya no está activo. Verifica con el negocio.
        </p>
      </div>
    );
  }

  // ── Vista CONFIRMAR (después de que el usuario tocó "Reservar") ────
  if (view === "confirm" && selectedService && selectedBarber && selectedSlot) {
    const totalDuration = selectedService.durationMin;
    const totalPrice = selectedService.price;
    const barberLabel = selectedBarber.name;
    const branchLabel = branches.find((b) => b.id === branchId)?.name || branchInfo?.name || "";
    const phoneOk = isValidChileanPhone(clientPhone);
    const canConfirm = !!(agree && clientName.trim() && phoneOk && !submitting);

    return (
      <div className="bk bk-cf">
        <header className="bk-cf__bar">
          <button
            type="button"
            className="bk-cf__back"
            aria-label="Volver"
            onClick={() => { setView("express"); setError(""); }}
          >
            <IconBack className="bk-icon-sm" />
          </button>
          <h1>Confirmar reserva</h1>
          <span className="bk-cf__step">Casi listo</span>
        </header>

        <div className="bk-cf__main">
          {/* Ticket-resumen */}
          <section className="bk-cf__ticket" aria-label="Resumen de tu reserva">
            <p className="bk-cf__ticket-eyebrow">Resumen</p>
            <h2 className="bk-cf__ticket-h2">{selectedService.name}</h2>
            <p className="bk-cf__ticket-when">
              {fmtDayLong(selectedDate)} · {fmtSlot(selectedSlot.start)} hrs
            </p>
            <hr className="bk-cf__ticket-rule" />
            <dl className="bk-cf__ticket-rows">
              <div className="bk-cf__ticket-row">
                <dt>Sucursal</dt>
                <dd>{branchLabel}</dd>
              </div>
              <div className="bk-cf__ticket-row">
                <dt>Profesional</dt>
                <dd>{barberLabel}</dd>
              </div>
              <div className="bk-cf__ticket-row">
                <dt>Duración</dt>
                <dd>{totalDuration} min</dd>
              </div>
              <div className="bk-cf__ticket-row">
                <dt>Reserva</dt>
                <dd>Sin pago previo</dd>
              </div>
            </dl>
            <div className="bk-cf__ticket-total">
              <dt>Total</dt>
              <dd>{formatCLP(totalPrice)}</dd>
            </div>
          </section>

          <section>
            <p className="bk-cf__form-h">Tus datos</p>

            <div className="bk-cf__field">
              <label className="bk-cf__field-label">Nombre completo</label>
              <input
                className="bk-cf__input"
                type="text"
                placeholder="Ej: Diego Rojas"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="bk-cf__field">
              <label className="bk-cf__field-label">Teléfono</label>
              <div className={`bk-cf__phone-wrap${phoneTouched && clientPhone && !phoneOk ? " is-error" : ""}`}>
                <span className="bk-cf__phone-cc">🇨🇱 +56</span>
                <input
                  className="bk-cf__phone-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="9 1234 5678"
                  value={normalizeChileanLocal(clientPhone)}
                  onChange={(e) => setClientPhone(formatChileanPhone(e.target.value))}
                  onBlur={() => setPhoneTouched(true)}
                  maxLength={11}
                />
              </div>
              {phoneTouched && clientPhone && !phoneOk && (
                <p className="bk-cf__error">
                  Ingresa un número chileno válido (9 dígitos, ej: 9 1234 5678)
                </p>
              )}
            </div>

            <div className="bk-cf__field">
              <label className="bk-cf__field-label">
                Email <span style={{ color: "var(--mb-fg-subtle)", fontWeight: 400 }}>· opcional</span>
              </label>
              <input
                className="bk-cf__input"
                type="email"
                placeholder="diego@ejemplo.cl"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <label className="bk-cf__check">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>
                Acepto recibir confirmación y recordatorio por WhatsApp.
              </span>
            </label>
          </section>

          {error && (
            <div role="alert" aria-live="assertive" style={{ marginTop: 16, padding: "12px 14px", borderRadius: 8, background: "var(--mb-danger-soft)", border: "1px solid color-mix(in srgb, var(--mb-danger) 30%, transparent)", color: "var(--mb-danger)", fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        <div className="bk-cf__cta">
          <button
            type="button"
            className="bk-cf__cta-btn"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            <IconCheck className="bk-icon-sm" />
            {submitting ? "Reservando..." : `Confirmar reserva · ${formatCLP(totalPrice)}`}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // Vista EXPRESS (default) — todo visible en una sola pantalla
  // ════════════════════════════════════════════════════════════════════
  const dayClosed = dayHeat?.level === "closed";
  const dayFull = dayHeat?.level === "full";
  const branchLabel = branches.find((b) => b.id === branchId)?.name || branchInfo?.name || "Sucursal";

  return (
    <div className="bk bk-a" aria-busy={submitting || servicesLoading}>
      {/* Header */}
      <header className="bk-a__bar">
        <Link href={`/${slug}`} className="bk-a__brand" style={{ textDecoration: "none" }}>
          {branchInfo?.orgName?.split(" ").length === 2 ? (
            <>
              {branchInfo.orgName.split(" ")[0]}
              <span>{branchInfo.orgName.split(" ")[1]}</span>
            </>
          ) : (
            branchInfo?.orgName || slug
          )}
        </Link>
        {branches.length >= 2 ? (
          <button
            type="button"
            className="bk-a__location"
            onClick={() => {
              const idx = branches.findIndex((b) => b.id === branchId);
              const next = branches[(idx + 1) % branches.length];
              if (next) pickBranch(next.id);
            }}
            aria-label="Cambiar sucursal"
          >
            <IconPin width={14} height={14} />
            {branchLabel}
            <IconChevDown className="bk-a__location-chev" width={14} height={14} />
          </button>
        ) : (
          <span className="bk-a__location" style={{ cursor: "default", color: "var(--mb-fg-muted)" }}>
            <IconPin width={14} height={14} />
            {branchLabel}
          </span>
        )}
      </header>

      <div className="bk-a__main">
        {/* ── BLOQUE INFO DEL NEGOCIO (hero + contacto + horario + mapa) ──
            Va arriba del flujo Express para darle contexto al cliente que
            llega por primera vez (Google, Instagram, link compartido).
            Si el negocio aún no cargó info, no rendea nada — los skeletons
            del flujo de abajo cubren el loading. */}
        {branchInfo && (
          <section className="bk-a__biz">
            <div className="bk-a__biz-hero">
              {branchInfo.orgLogo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branchInfo.orgLogo}
                  alt={branchInfo.orgName || branchInfo.name}
                  className="bk-a__biz-logo"
                />
              )}
              <p className="bk-a__biz-eyebrow">Barbería</p>
              <h1 className="bk-a__biz-name">{branchInfo.orgName || branchInfo.name}</h1>
              {branchInfo.orgDescription && (
                <p className="bk-a__biz-desc">{branchInfo.orgDescription}</p>
              )}
              {branchInfo.address && (
                <p className="bk-a__biz-address">
                  <IconPin width={13} height={13} />
                  {branchInfo.address}
                </p>
              )}
            </div>

            <div className="bk-a__biz-quick">
              {branchInfo.phone && (
                <a
                  href={`https://wa.me/${branchInfo.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bk-a__biz-quickbtn"
                >
                  <span className="bk-a__biz-quickbtn-icon" style={{ background: "color-mix(in srgb, var(--mb-whatsapp) 12%, white)", color: "var(--mb-whatsapp)" }}>
                    <IconWhatsApp width={16} height={16} />
                  </span>
                  <span className="bk-a__biz-quickbtn-text">
                    <strong>WhatsApp</strong>
                    <small>{branchInfo.phone}</small>
                  </span>
                </a>
              )}
              {branchInfo.workingHours.length > 0 && (
                <button
                  type="button"
                  onClick={() => setScheduleOpen((v) => !v)}
                  className="bk-a__biz-quickbtn"
                  aria-expanded={scheduleOpen}
                >
                  <span className="bk-a__biz-quickbtn-icon" style={{ background: "var(--mb-brand-10)", color: "var(--mb-brand)" }}>
                    <IconClock width={16} height={16} />
                  </span>
                  <span className="bk-a__biz-quickbtn-text">
                    <strong>Horario</strong>
                    <small>{scheduleOpen ? "Ocultar" : "Ver horario"}</small>
                  </span>
                </button>
              )}
            </div>

            {scheduleOpen && branchInfo.workingHours.length > 0 && (
              <div className="bk-a__biz-schedule">
                {branchInfo.workingHours.map((wh) => (
                  <div key={wh.dayOfWeek} className="bk-a__biz-schedule-row">
                    <span>{DAY_NAMES[wh.dayOfWeek]}</span>
                    <span className={wh.isOpen ? "" : "is-closed"}>
                      {wh.isOpen ? `${wh.openTime} – ${wh.closeTime}` : "Cerrado"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {branchInfo.latitude && branchInfo.longitude && (
              <iframe
                title="Ubicación"
                className="bk-a__biz-map"
                loading="lazy"
                src={`https://maps.google.com/maps?q=${branchInfo.latitude},${branchInfo.longitude}&z=16&output=embed`}
              />
            )}
          </section>
        )}

        <h1 className="bk-a__hello">
          Reserva tu hora <em>en 30 segundos</em>.
        </h1>
        <p className="bk-a__sub">Elige y confirmamos al instante.</p>

        {/* SERVICIOS */}
        <section className="bk-a__section">
          <div className="bk-a__h">
            <h3>1 · Servicio</h3>
            {selectedService && (
              <span className="bk-a__h-counter">
                {selectedService.durationMin} min · {formatCLP(selectedService.price)}
              </span>
            )}
          </div>
          {servicesLoading ? (
            <div className="bk-a__svc-grid" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bk-skel" style={{ height: 64 }} />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="bk-a__empty"><p>No hay servicios disponibles ahora.</p></div>
          ) : (
            <div className="bk-a__svc-grid">
              {services.map((s) => {
                const on = s.id === selectedServiceId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`bk-a__svc${on ? " is-on" : ""}`}
                    onClick={() => pickService(s.id)}
                    aria-pressed={on}
                  >
                    <div className="bk-a__svc-info">
                      <p className="bk-a__svc-name">{s.name}</p>
                      <p className="bk-a__svc-meta">
                        <span>{s.durationMin} min</span>
                        {s.category && <span>· {s.category}</span>}
                      </p>
                    </div>
                    <p className="bk-a__svc-price">{formatCLP(s.price)}</p>
                    <span className="bk-a__svc-check">
                      <IconCheck />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* DÍA — antes que profesional para que el cliente vea el heatmap */}
        {selectedService && (
          <section className="bk-a__section">
            <div className="bk-a__h">
              <h3>2 · Día</h3>
              <span className="bk-a__h-counter">
                {dayHeat ? (dayHeat.level === "closed" ? "Cerrado" : `${dayHeat.availableSlots} cupos`) : "Próximos 14 días"}
              </span>
            </div>
            <div className="bk-a__days">
              {dateOptions.map((date) => {
                const d = new Date(date + "T12:00:00");
                const isSelected = date === selectedDate;
                const isToday = date === new Date().toISOString().split("T")[0];
                const dayName = d.toLocaleDateString("es-CL", { weekday: "short" });
                const hm = heatmap.find((h) => h.date === date);
                const closed = hm?.level === "closed";
                return (
                  <button
                    key={date}
                    type="button"
                    className={`bk-a__day${isSelected ? " is-on" : ""}${closed ? " is-closed" : ""}`}
                    onClick={() => !closed && pickDate(date)}
                    disabled={closed}
                    aria-pressed={isSelected}
                    aria-label={`${d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}${hm ? ", " + (closed ? "cerrado" : `${hm.availableSlots} cupos`) : ""}`}
                  >
                    <div className="bk-a__day-dow">{isToday ? "Hoy" : dayName}</div>
                    <div className="bk-a__day-num">{d.getDate()}</div>
                    <div className="bk-a__day-dot" style={{ background: heatColor(hm?.level) }} />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* PROFESIONAL */}
        {selectedService && selectedDate && !dayClosed && (
          <section className="bk-a__section">
            <div className="bk-a__h">
              <h3>3 · Profesional</h3>
              <span className="bk-a__h-counter">
                {barbers.filter((b) => b.availableSlots > 0).length} disponibles
              </span>
            </div>
            {barbersLoading ? (
              <div className="bk-a__barbers" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: 80, flex: "0 0 auto" }}>
                    <div className="bk-skel" style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto" }} />
                    <div className="bk-skel" style={{ width: 50, height: 10, margin: "8px auto 0" }} />
                  </div>
                ))}
              </div>
            ) : barbers.length === 0 ? (
              <div className="bk-a__empty"><p>Nadie disponible para este servicio. Probá otro día.</p></div>
            ) : (
              <div className="bk-a__barbers" role="radiogroup" aria-label="Profesional">
                {barbers.filter((b) => b.availableSlots > 0).length >= 2 && (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedBarber?.id === ANY_BARBER_ID}
                    className={`bk-a__barber is-any${selectedBarber?.id === ANY_BARBER_ID ? " is-on" : ""}`}
                    onClick={() => pickBarber("any")}
                  >
                    <span className="bk-a__bar-avatar">✦</span>
                    <span className="bk-a__bar-name">Cualquiera</span>
                    <span className="bk-a__bar-role">Más rápido</span>
                  </button>
                )}
                {barbers.map((b) => {
                  const on = selectedBarber?.id === b.id;
                  const disabled = b.availableSlots === 0;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={disabled}
                      className={`bk-a__barber${on ? " is-on" : ""}`}
                      onClick={() => pickBarber(b)}
                    >
                      <span
                        className="bk-a__bar-avatar"
                        style={on ? { borderColor: b.color || undefined } : undefined}
                      >
                        {initials(b.name)}
                      </span>
                      <span className="bk-a__bar-name">{b.name.split(" ")[0]}</span>
                      <span className="bk-a__bar-role">
                        {disabled ? "Sin cupos" : `${b.availableSlots} cupos`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* HORA */}
        {selectedBarber && (
          <section className="bk-a__section">
            <div className="bk-a__h">
              <h3>4 · Hora</h3>
              <span className="bk-a__h-counter">
                {dayClosed ? "Cerrado" : dayFull ? "Lleno" : selectedSlot ? fmtSlot(selectedSlot.start) : "Disponible"}
              </span>
            </div>

            {dayFull ? (
              <div className="bk-a__waitlist">
                <IconBell width={18} height={18} />
                <div style={{ flex: 1 }}>
                  <p className="bk-a__waitlist-h">Este día está lleno</p>
                  {waitlistSubmitted ? (
                    <p className="bk-a__waitlist-p">
                      ✓ Te anotamos (posición #{waitlistPosition}). Te avisamos si se libera.
                    </p>
                  ) : (
                    <>
                      <p className="bk-a__waitlist-p">
                        Anótate y te avisamos si se libera un horario.
                      </p>
                      <input
                        className="bk-cf__input"
                        type="text"
                        placeholder="Tu nombre"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        style={{ marginBottom: 8, padding: "8px 10px", fontSize: 13 }}
                      />
                      <div className={`bk-cf__phone-wrap${phoneTouched && clientPhone && !isValidChileanPhone(clientPhone) ? " is-error" : ""}`} style={{ marginBottom: 8 }}>
                        <span className="bk-cf__phone-cc" style={{ padding: "8px 10px", fontSize: 13 }}>+56</span>
                        <input
                          className="bk-cf__phone-input"
                          type="tel"
                          inputMode="tel"
                          placeholder="9 1234 5678"
                          value={normalizeChileanLocal(clientPhone)}
                          onChange={(e) => setClientPhone(formatChileanPhone(e.target.value))}
                          onBlur={() => setPhoneTouched(true)}
                          style={{ padding: "8px 10px", fontSize: 13 }}
                        />
                      </div>
                      <button
                        type="button"
                        className="bk-a__waitlist-btn"
                        onClick={handleJoinWaitlist}
                        disabled={waitlistLoading || !clientName.trim() || !isValidChileanPhone(clientPhone)}
                      >
                        {waitlistLoading ? "Anotando..." : "Sumarme a la lista de espera"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : slotsLoading ? (
              <div className="bk-a__slots" aria-busy="true">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bk-skel" style={{ height: 38 }} />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <div className="bk-a__empty"><p>Sin horarios disponibles para este día.</p></div>
            ) : (
              TIME_PERIODS.map((p) => {
                const periodSlots = slots.filter((s) => {
                  const h = new Date(s.start).getHours();
                  return h >= p.from && h < p.to;
                });
                if (periodSlots.length === 0) return null;
                return (
                  <div key={p.key}>
                    <p className="bk-a__period">
                      <span>{p.icon}</span> {p.label}
                    </p>
                    <div className="bk-a__slots">
                      {periodSlots.map((s) => {
                        const on = selectedSlot?.start === s.start;
                        return (
                          <button
                            key={s.start}
                            type="button"
                            className={`bk-a__slot${on ? " is-on" : ""}`}
                            onClick={() => pickSlot(s)}
                            aria-pressed={on}
                          >
                            {fmtSlot(s.start)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}

        {/* NOTA */}
        {selectedSlot && (
          <section className="bk-a__section">
            <div className="bk-a__h">
              <h3>
                Nota para el barbero{" "}
                <em style={{ color: "var(--mb-fg-subtle)", fontWeight: 500, fontStyle: "normal", textTransform: "none", letterSpacing: 0 }}>
                  · opcional
                </em>
              </h3>
              <span className="bk-a__h-counter">{clientNote.length}/500</span>
            </div>
            <textarea
              className="bk-a__note"
              placeholder="Ej: prefiero degradado bajo, vengo apurado, alérgico a ciertos productos"
              value={clientNote}
              onChange={(e) => setClientNote(e.target.value.slice(0, 500))}
              maxLength={500}
            />
          </section>
        )}

        {/* Mensaje de error inline (race 409) */}
        {error && (
          <div role="alert" aria-live="assertive" style={{ marginTop: 16, padding: "12px 14px", borderRadius: 8, background: "var(--mb-danger-soft)", border: "1px solid color-mix(in srgb, var(--mb-danger) 30%, transparent)", color: "var(--mb-danger)", fontSize: 13 }}>
            {error}
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="bk-a__cta">
        <div className="bk-a__cta-card">
          <div className="bk-a__cta-info">
            <div className="bk-a__cta-info-h">
              {ready ? "Listo para reservar" : !selectedService ? "Falta servicio" : !selectedDate ? "Falta día" : !selectedBarber ? "Falta profesional" : "Falta hora"}
            </div>
            <div className="bk-a__cta-info-text">
              {selectedService ? selectedService.name : "Sin servicio"}
              {selectedSlot && ` · ${fmtSlot(selectedSlot.start)}`}
              {selectedService && (
                <> · <strong>{formatCLP(selectedService.price)}</strong></>
              )}
            </div>
          </div>
          <button
            type="button"
            className="bk-a__cta-go"
            disabled={!ready}
            onClick={() => { setError(""); setView("confirm"); }}
          >
            Reservar
            <IconArrow className="bk-icon-sm" />
          </button>
        </div>
      </div>
    </div>
  );
}
