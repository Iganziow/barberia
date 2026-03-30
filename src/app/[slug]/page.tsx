"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type WorkingHour = { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string };
type Branch = { name: string; address: string; phone: string | null; workingHours: WorkingHour[] };
type BarberService = { id: string; name: string; description: string | null; durationMin: number; price: number; categoryName: string | null };
type Barber = { id: string; name: string; color: string | null; workDays: number[]; services: BarberService[] };

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function formatPrice(p: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(p);
}

export default function OrgLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.cookie = `bb_org=${encodeURIComponent(slug)};path=/;max-age=${60 * 60 * 24 * 30};SameSite=Strict`;
    fetch(`/api/book/info?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => {
        setBranch(d.branch);
        setBarbers(d.barbers || []);
        if (d.barbers?.[0]) {
          setSelectedBarber(d.barbers[0].id);
          const firstCat = d.barbers[0].services?.[0]?.categoryName || "Servicios";
          setOpenCategories(new Set([firstCat]));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const activeBarber = barbers.find((b) => b.id === selectedBarber);

  // Group services by category
  const groupedServices: Record<string, BarberService[]> = {};
  if (activeBarber) {
    for (const svc of activeBarber.services) {
      const cat = svc.categoryName || "Servicios";
      if (!groupedServices[cat]) groupedServices[cat] = [];
      groupedServices[cat].push(svc);
    }
  }

  const bookUrl = `/${slug}/book`;

  function toggleCategory(cat: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // Open first category when selecting a barber (called from event handler)
  function selectBarberAndOpenFirst(barberId: string) {
    setSelectedBarber(barberId);
    // Compute categories for this barber
    const barber = barbers.find((b) => b.id === barberId);
    if (barber) {
      const cats = new Set<string>();
      for (const svc of barber.services) {
        cats.add(svc.categoryName || "Servicios");
      }
      const first = [...cats][0];
      if (first) setOpenCategories(new Set([first]));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f6] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-2xl font-extrabold text-stone-900">Mar<span className="text-[#c87941]">Brava</span></div>
          <div className="h-1 w-24 mx-auto rounded-full bg-[#c87941]/20 overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-[#c87941] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f6]">
      {/* Nav */}
      <nav className="sticky top-0 z-20 border-b border-[#e8e2dc] bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-extrabold tracking-tight text-stone-900">
            Mar<span className="text-[#c87941]">Brava</span>
          </h1>
          <Link
            href={bookUrl}
            className="rounded-full bg-[#c87941] px-5 py-1.5 text-xs font-semibold text-white hover:bg-[#b56a35] transition"
          >
            Reservar
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-4 py-5 space-y-5">
        {/* Hero */}
        <div className="rounded-2xl bg-[#1a1412] p-6 sm:p-8 text-center overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#c87941]/10 to-transparent pointer-events-none" />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Mar<span className="text-[#c87941]">Brava</span>
            </h2>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 mt-1.5 font-medium">Barbería</p>
            {branch?.address && (
              <p className="mt-3 text-xs text-white/50">{branch.address}</p>
            )}
            <Link
              href={bookUrl}
              className="mt-5 inline-block rounded-full bg-[#c87941] px-8 py-2.5 text-sm font-semibold text-white hover:bg-[#b56a35] transition shadow-lg shadow-[#c87941]/25"
            >
              Reservar hora
            </Link>
          </div>
        </div>

        {/* Quick info */}
        <div className="grid grid-cols-2 gap-3">
          {branch?.phone && (
            <a
              href={`https://wa.me/${branch.phone.replace(/\D/g, "")}`}
              className="flex items-center gap-2.5 rounded-xl border border-[#e8e2dc] bg-white p-3.5 hover:border-[#c87941]/30 transition"
            >
              <div className="grid h-9 w-9 place-items-center rounded-full bg-green-50 shrink-0">
                <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.126 1.524 5.867L.05 23.308a.75.75 0 00.892.892l5.441-1.474A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.94 9.94 0 01-5.39-1.582l-.386-.232-3.232.876.876-3.232-.232-.386A9.94 9.94 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-800 truncate">WhatsApp</p>
                <p className="text-[10px] text-stone-400 truncate">{branch.phone}</p>
              </div>
            </a>
          )}
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            className="flex items-center gap-2.5 rounded-xl border border-[#e8e2dc] bg-white p-3.5 hover:border-[#c87941]/30 transition text-left"
          >
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#c87941]/10 shrink-0">
              <svg className="h-4 w-4 text-[#c87941]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-stone-800">Horario</p>
              <p className="text-[10px] text-stone-400">
                {showSchedule ? "Ocultar" : "Ver horario"}
              </p>
            </div>
          </button>
        </div>

        {/* Schedule dropdown */}
        {showSchedule && branch?.workingHours && (
          <div className="rounded-xl border border-[#e8e2dc] bg-white p-4 space-y-2 animate-in">
            {branch.workingHours.map((wh) => (
              <div key={wh.dayOfWeek} className="flex justify-between text-sm py-1">
                <span className="text-stone-600">{DAY_NAMES[wh.dayOfWeek]}</span>
                <span className={wh.isOpen ? "font-medium text-stone-800" : "text-stone-400"}>
                  {wh.isOpen ? `${wh.openTime} - ${wh.closeTime}` : "Cerrado"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Barbers + Services */}
        {barbers.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-stone-900">Nuestros profesionales</h2>

            {/* Barber tabs */}
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {barbers.map((b) => {
                const isActive = b.id === selectedBarber;
                const initials = b.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <button
                    key={b.id}
                    onClick={() => selectBarberAndOpenFirst(b.id)}
                    className={`flex items-center gap-2.5 shrink-0 rounded-full border py-1.5 pl-1.5 pr-4 transition ${
                      isActive
                        ? "border-[#c87941] bg-[#c87941]/10"
                        : "border-[#e8e2dc] bg-white hover:border-[#c87941]/30"
                    }`}
                  >
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: b.color || "#c87941" }}
                    >
                      {initials}
                    </div>
                    <span className={`text-sm font-medium ${isActive ? "text-[#c87941]" : "text-stone-600"}`}>
                      {b.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active barber services */}
            {activeBarber && (
              <div className="space-y-1">
                {/* Work days */}
                <p className="text-[11px] text-stone-400 px-1">
                  {activeBarber.workDays.length > 0
                    ? activeBarber.workDays.map((d) => DAY_NAMES[d].slice(0, 3)).join(" · ")
                    : "Horario no definido"}
                </p>

                {/* Services — collapsible by category */}
                {Object.keys(groupedServices).length === 0 ? (
                  <div className="rounded-xl border border-[#e8e2dc] bg-white p-6 text-center">
                    <p className="text-sm text-stone-400">Sin servicios asignados</p>
                  </div>
                ) : (
                  Object.entries(groupedServices).map(([cat, svcs]) => {
                    const isOpen = openCategories.has(cat);
                    return (
                    <div key={cat} className="rounded-xl border border-[#e8e2dc] bg-white overflow-hidden">
                      <button
                        onClick={() => toggleCategory(cat)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-stone-50/50 hover:bg-stone-100/50 transition text-left"
                      >
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">{cat}</h4>
                          <span className="text-[10px] text-stone-400 font-normal normal-case">({svcs.length})</span>
                        </div>
                        <svg className={`h-4 w-4 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {isOpen && svcs.map((svc, i) => (
                        <div
                          key={svc.id}
                          className={`px-4 py-3 ${
                            i < svcs.length - 1 ? "border-b border-[#e8e2dc]" : ""
                          } ${i === 0 ? "border-t border-[#e8e2dc]" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-stone-800">{svc.name}</p>
                              {svc.description && (
                                <p className="text-xs text-stone-400 mt-1 leading-relaxed">{svc.description}</p>
                              )}
                              <p className="text-xs text-stone-400 mt-1">{svc.durationMin} min</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-bold text-stone-800">{formatPrice(svc.price)}</span>
                              <Link
                                href={bookUrl}
                                className="rounded-full bg-[#c87941] px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#b56a35] transition"
                              >
                                Reservar
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="text-center pt-2 pb-4">
          <Link
            href={bookUrl}
            className="inline-block rounded-full bg-[#c87941] px-10 py-3 text-sm font-semibold text-white hover:bg-[#b56a35] transition shadow-lg shadow-[#c87941]/20"
          >
            Reservar hora
          </Link>
        </div>

        <footer className="border-t border-[#e8e2dc] pt-4 pb-6 text-center text-[11px] text-stone-400">
          &copy; {new Date().getFullYear()} MarBrava Barbería · Ancud, Chiloé
        </footer>
      </div>
    </div>
  );
}
