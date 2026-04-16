"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AgendaCalendar from "./AgendaCalendar";
import AgendaBarberDayGrid from "./AgendaBarberDayGrid";
import AgendaSidebar from "./AgendaSidebar";
import AgendaViewToggle, { type AgendaViewMode } from "./AgendaViewToggle";
import SlotMinutesPicker from "./SlotMinutesPicker";
import { useSlotMinutes } from "@/hooks/use-slot-minutes";
import MiniMonthCalendar from "./MiniMonthCalendar";
import NewReservationModal from "./NewReservationModal";
import BlockTimeModal from "./BlockTimeModal";
import SlotActionMenu from "./SlotActionMenu";
import AppointmentDetailModal from "./AppointmentDetailModal";
import QuickTimeSearchModal from "./QuickTimeSearchModal";
import { useBarbers } from "@/hooks/use-barbers";
import { useServices } from "@/hooks/use-services";
import { useBranches } from "@/hooks/use-branches";
import { useAgendaEvents } from "@/hooks/use-agenda-events";
import { useBarberSchedules } from "@/hooks/use-barber-schedules";
import { useVisibleRange } from "@/hooks/use-visible-range";
import { useQuickStats } from "@/hooks/use-quick-stats";
import { useAuthUser } from "@/hooks/use-auth-user";
import { formatCLP, formatTime } from "@/lib/format";
import type { AppointmentStatusCode, StatusPreset } from "@/types/agenda";
import {
  STATUS_ACTIVE,
  filterAgendaEvents,
  statusesForPreset,
} from "./agendaFilters";
import { computeUnavailableBlocks } from "./barberScheduleBlocks";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date): Date {
  // Lunes como primer día
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // 0 si es lunes
  x.setDate(x.getDate() - dow);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function AdminAgenda() {
  // filtros
  const [branchId, setBranchId] = useState("");
  const [barberIds, setBarberIds] = useState<string[]>([]);
  const [statusPreset, setStatusPreset] = useState<StatusPreset>("ACTIVE");
  const [customStatuses, setCustomStatuses] = useState<AppointmentStatusCode[]>(
    STATUS_ACTIVE
  );

  // vista y fecha
  const [viewMode, setViewMode] = useState<AgendaViewMode>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const { range: visibleRange, setRange: setVisibleRange } = useVisibleRange();
  const { slotMinutes, setSlotMinutes } = useSlotMinutes();

  // mobile sidebar
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Popover del mini-calendar desde el click en la fecha del header
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!datePickerOpen) return;
    function onDocClick(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setDatePickerOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [datePickerOpen]);

  // Stats del día y perfil del usuario (para mostrar avatar en el header).
  const stats = useQuickStats();
  const { user } = useAuthUser();
  const userInitials = (user?.name ?? "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // datos
  const { branches } = useBranches();
  const effectiveBranchId = branchId || (branches.length > 0 ? branches[0].id : "");
  const { barbers } = useBarbers(effectiveBranchId || undefined);
  const { services } = useServices();
  const { schedules } = useBarberSchedules(effectiveBranchId || undefined);

  // date range para fetch (día o semana completa)
  const dateRange = useMemo(() => {
    if (viewMode === "day") {
      return { from: startOfDay(selectedDate), to: startOfDay(selectedDate) };
    }
    const start = startOfWeek(selectedDate);
    return { from: start, to: addDays(start, 6) };
  }, [viewMode, selectedDate]);

  const { events, refetch } = useAgendaEvents({
    branchId: effectiveBranchId || undefined,
    from: dateRange.from.toISOString(),
    to: new Date(dateRange.to.getTime() + 86_400_000 - 1).toISOString(),
  });

  // Determinar qué barberos considerar
  const effectiveBarberIds = useMemo(() => {
    return barberIds.length > 0 ? barberIds : barbers.map((b) => b.id);
  }, [barberIds, barbers]);

  // Bloques de "no disponible" desde BarberSchedule
  const unavailableBlocks = useMemo(() => {
    if (!effectiveBranchId || effectiveBarberIds.length === 0) return [];
    return computeUnavailableBlocks({
      schedules,
      barberIds: effectiveBarberIds,
      fromDay: dateRange.from,
      toDay: dateRange.to,
      visibleRange,
    });
  }, [schedules, effectiveBarberIds, dateRange, visibleRange, effectiveBranchId]);

  // Status set activo según preset
  const activeStatuses = useMemo(() => {
    if (statusPreset === "CUSTOM") return customStatuses;
    return statusesForPreset(statusPreset);
  }, [statusPreset, customStatuses]);

  const filteredEvents = useMemo(() => {
    const merged = [...events, ...unavailableBlocks];
    return filterAgendaEvents(merged, {
      barberIds,
      statuses: activeStatuses,
    });
  }, [events, unavailableBlocks, barberIds, activeStatuses]);

  // modals
  const [newOpen, setNewOpen] = useState(false);
  const [selectedStartISO, setSelectedStartISO] = useState<string | null>(null);
  const [preselectedBarberId, setPreselectedBarberId] = useState<string>("");
  const [preselectedServiceId, setPreselectedServiceId] = useState<string>("");
  const [preselectedEndISO, setPreselectedEndISO] = useState<string | null>(null);

  const [blockOpen, setBlockOpen] = useState(false);
  const [blockStartISO, setBlockStartISO] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEventId, setDetailEventId] = useState<string | null>(null);

  const [quickSearchOpen, setQuickSearchOpen] = useState(false);

  // slot context menu
  const [slotMenuOpen, setSlotMenuOpen] = useState(false);
  const [slotMenuPos, setSlotMenuPos] = useState({ x: 240, y: 160 });
  const [slotISO, setSlotISO] = useState<string | null>(null);
  const [slotBarberId, setSlotBarberId] = useState<string>("");

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleCreateAppointment(data: {
    clientId: string;
    clientName: string;
    serviceId: string;
    startISO: string;
    endISO: string;
    barberId: string;
    status: string;
    price: number;
    notePublic?: string;
    noteInternal?: string;
  }) {
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: data.startISO,
          end: data.endISO,
          barberId: data.barberId,
          serviceId: data.serviceId,
          clientId: data.clientId,
          branchId: effectiveBranchId,
          price: data.price,
          notePublic: data.notePublic,
          noteInternal: data.noteInternal,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error al crear reserva" }));
        showToast(err.message || "Error al crear reserva", "error");
        return;
      }
      showToast("Reserva creada");
      refetch();
    } catch {
      showToast("Error de conexión al crear reserva", "error");
    }
  }

  async function handleCreateBlocks(
    blocks: Array<{
      reason: string;
      startISO: string;
      endISO: string;
      barberId: string;
    }>
  ) {
    try {
      const results = await Promise.all(
        blocks.map((b) =>
          fetch("/api/admin/block-times", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reason: b.reason,
              start: b.startISO,
              end: b.endISO,
              barberId: b.barberId,
            }),
          })
        )
      );
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) {
        showToast(`${failed} bloqueo(s) no se pudieron crear`, "error");
      } else {
        showToast(`${blocks.length} bloqueo(s) creado(s)`);
      }
      refetch();
    } catch {
      showToast("Error de conexión al crear bloqueos", "error");
    }
  }

  // Cuando se filtra a 1 barbero, muestra chip con X para deseleccionarlo.
  // Aplica tanto en vista Día como Semana para que siempre haya una forma
  // clara de volver a ver a todos los barberos.
  const singleSelectedBarber =
    barberIds.length === 1
      ? barbers.find((b) => b.id === barberIds[0])
      : null;

  return (
    // El main del AdminShell ya NO tiene padding/max-width en desktop (lg:px-0 lg:py-0
    // lg:max-w-none). La agenda se extiende al 100% del área disponible.
    <div className="flex -mx-4 -my-4 lg:mx-0 lg:my-0 min-h-[calc(100dvh-56px)] lg:min-h-screen bg-white border-t border-[#e8e2dc] lg:border-t-0">
      {/* Sidebar */}
      <AgendaSidebar
        branches={branches}
        branchId={effectiveBranchId}
        onChangeBranch={setBranchId}
        barbers={barbers}
        barberIds={barberIds}
        onChangeBarberIds={setBarberIds}
        statusPreset={statusPreset}
        customStatuses={customStatuses}
        onChangeStatusPreset={setStatusPreset}
        onChangeCustomStatuses={setCustomStatuses}
        visibleRange={visibleRange}
        onChangeVisibleRange={setVisibleRange}
        selectedDate={selectedDate}
        onSelectDate={(d) => setSelectedDate(startOfDay(d))}
        onOpenQuickSearch={() => setQuickSearchOpen(true)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-[#e8e2dc] bg-white px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden grid h-8 w-8 place-items-center rounded-md border border-[#e8e2dc] text-stone-600"
              aria-label="Abrir filtros"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 3h12v2H2zM4 7h8v2H4zM6 11h4v2H6z" />
              </svg>
            </button>
            <div className="min-w-0 relative" ref={datePickerRef}>
              <button
                type="button"
                onClick={() => setDatePickerOpen((v) => !v)}
                className="group flex items-center gap-1.5 text-left hover:text-brand transition"
                aria-expanded={datePickerOpen}
                aria-haspopup="dialog"
                title="Elegir fecha"
              >
                <h1 className="text-[17px] font-bold tracking-tight text-stone-900 leading-tight truncate capitalize group-hover:text-brand">
                  {selectedDate.toLocaleDateString("es-CL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                  <span className="text-stone-400 font-medium ml-1.5">
                    {selectedDate.getFullYear()}
                  </span>
                </h1>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className={`text-stone-400 group-hover:text-brand transition-transform ${datePickerOpen ? "rotate-180" : ""}`}
                >
                  <path d="M3 4.5L6 7.5L9 4.5" />
                </svg>
              </button>
              <div className="text-[11px] text-stone-500 flex items-center gap-2 flex-wrap mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" className="text-stone-400">
                    <path d="M10 2L2 8v10h5v-6h6v6h5V8z" />
                  </svg>
                  {branches.find((b) => b.id === effectiveBranchId)?.name || "—"}
                </span>
                {/* Stats contextuales (día) */}
                <span className="text-stone-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" className="text-brand">
                    <rect x="3" y="4" width="14" height="14" rx="1.5" fillOpacity="0.2" />
                    <rect x="3" y="4" width="14" height="3.5" rx="1.5" />
                  </svg>
                  <b className="font-semibold text-stone-700 tabular-nums">{stats?.appointmentCount ?? 0}</b>
                  <span className="text-stone-400">citas</span>
                </span>
                <span className="text-stone-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" className="text-brand">
                    <circle cx="10" cy="10" r="8" fillOpacity="0.2" />
                    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 6v4l2.5 1.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </svg>
                  <span className="text-stone-400">próxima</span>
                  <b className="font-semibold text-stone-700 tabular-nums">
                    {stats?.nextAppointmentTime ? formatTime(stats.nextAppointmentTime) : "—"}
                  </b>
                </span>
                <span className="text-stone-300 hidden sm:inline">·</span>
                <span className="inline-flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" className="text-brand">
                    <circle cx="10" cy="10" r="8" fillOpacity="0.2" />
                    <path d="M10 5v10M7 8c0-1 1-1.5 3-1.5s3 .5 3 2-1.5 1.5-3 1.5-3 .5-3 2 1 1.5 3 1.5 3-.5 3-1.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                  </svg>
                  <b className="font-semibold text-stone-700 tabular-nums">
                    {stats ? formatCLP(stats.todayRevenue) : "—"}
                  </b>
                </span>
                {singleSelectedBarber && (
                  <>
                    <span className="text-stone-300">·</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 text-brand px-2 py-0.5 font-medium">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: singleSelectedBarber.color || "#c87941" }}
                      />
                      {singleSelectedBarber.name}
                      <button
                        type="button"
                        onClick={() => setBarberIds([])}
                        className="ml-0.5 opacity-60 hover:opacity-100"
                        aria-label="Quitar filtro de barbero"
                      >
                        ×
                      </button>
                    </span>
                  </>
                )}
              </div>

              {/* Popover del mini calendar */}
              {datePickerOpen && (
                <div
                  role="dialog"
                  aria-label="Seleccionar fecha"
                  className="absolute top-full left-0 mt-2 z-40 w-[260px] rounded-xl border border-[#e8e2dc] bg-white shadow-2xl p-3"
                >
                  <MiniMonthCalendar
                    selectedDate={selectedDate}
                    onSelectDate={(d) => {
                      setSelectedDate(startOfDay(d));
                      setDatePickerOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedDate(startOfDay(new Date()))}
              className="rounded-md border border-[#e8e2dc] bg-white px-3 h-8 text-xs font-semibold text-stone-700 hover:border-brand/40 hover:text-brand transition"
            >
              Hoy
            </button>
            <div className="inline-flex rounded-md border border-[#e8e2dc] overflow-hidden h-8">
              <button
                type="button"
                onClick={() =>
                  setSelectedDate(addDays(selectedDate, viewMode === "day" ? -1 : -7))
                }
                className="px-2.5 text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition"
                aria-label="Anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedDate(addDays(selectedDate, viewMode === "day" ? 1 : 7))
                }
                className="px-2.5 text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition border-l border-[#e8e2dc]"
                aria-label="Siguiente"
              >
                ›
              </button>
            </div>
            {viewMode === "day" && (
              <SlotMinutesPicker value={slotMinutes} onChange={setSlotMinutes} />
            )}
            <AgendaViewToggle mode={viewMode} onChange={setViewMode} />
            <button
              className="h-8 rounded-md bg-brand px-3.5 text-xs font-semibold text-white hover:bg-brand-hover transition shadow-sm flex items-center gap-1.5"
              onClick={() => {
                const x = Math.min(window.innerWidth - 240, window.innerWidth - 260);
                setSlotMenuPos({ x, y: 140 });
                setSlotISO(new Date().toISOString());
                setSlotBarberId("");
                setSlotMenuOpen(true);
              }}
            >
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M7 1v12M1 7h12" />
              </svg>
              Nuevo
            </button>

            {/* Avatar del usuario (desktop only — mobile usa topbar) */}
            {user && (
              <div className="hidden lg:flex items-center gap-2 rounded-full border border-[#e8e2dc] bg-white pl-1.5 pr-3 py-1 ml-1">
                <div className="grid h-6 w-6 place-items-center rounded-full bg-brand text-[10px] font-bold text-white">
                  {userInitials}
                </div>
                <span className="text-[12px] font-medium text-stone-700">{user.name?.split(" ")[0]}</span>
              </div>
            )}
          </div>
        </div>

        {/* Calendar area */}
        <div className="flex-1 overflow-hidden bg-white">
          {viewMode === "day" ? (
            <div className="p-3 h-full">
              <div className="h-full rounded-xl border border-[#eae6e1] bg-white shadow-sm overflow-hidden">
                <AgendaBarberDayGrid
                  date={selectedDate}
                  visibleRange={visibleRange}
                  slotMinutes={slotMinutes}
                  barbers={barbers.filter(
                    (b) => barberIds.length === 0 || barberIds.includes(b.id)
                  )}
                  events={filteredEvents}
                  onSelectSlot={({ isoStart, barberId: b, x, y }) => {
                    setSlotISO(isoStart);
                    setSlotBarberId(b);
                    setSlotMenuPos({ x, y });
                    setSlotMenuOpen(true);
                  }}
                  onClickEvent={(eventId) => {
                    const ev = events.find((e) => e.id === eventId);
                    if (ev?.kind === "APPOINTMENT") {
                      setDetailEventId(eventId);
                      setDetailOpen(true);
                    }
                  }}
                  onClickBarberHeader={(barberId) => {
                    setBarberIds([barberId]);
                    setViewMode("week");
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="p-3">
              <AgendaCalendar
                events={filteredEvents}
                visibleRange={visibleRange}
                initialDate={selectedDate.toISOString()}
                onSelectSlot={({ isoStart, x, y }) => {
                  setSlotISO(isoStart);
                  setSlotBarberId("");
                  setSlotMenuPos({ x, y });
                  setSlotMenuOpen(true);
                }}
                onClickEvent={(eventId) => {
                  const ev = events.find((e) => e.id === eventId);
                  if (ev?.kind === "APPOINTMENT") {
                    setDetailEventId(eventId);
                    setDetailOpen(true);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <NewReservationModal
        open={newOpen}
        onClose={() => {
          setNewOpen(false);
          setPreselectedServiceId("");
          setPreselectedBarberId("");
          setPreselectedEndISO(null);
        }}
        startISO={selectedStartISO}
        endISO={preselectedEndISO}
        barberId={
          preselectedBarberId || slotBarberId || barberIds[0] || barbers[0]?.id || ""
        }
        serviceId={preselectedServiceId || undefined}
        barbers={barbers}
        services={services}
        existingEvents={events}
        onCreate={handleCreateAppointment}
      />

      {blockOpen && (
        <BlockTimeModal
          open={blockOpen}
          onClose={() => setBlockOpen(false)}
          startISO={blockStartISO}
          defaultBarberId={slotBarberId || barberIds[0] || barbers[0]?.id || ""}
          barbers={barbers}
          existingEvents={events}
          onCreateMany={handleCreateBlocks}
        />
      )}

      <AppointmentDetailModal
        open={detailOpen}
        appointmentId={detailEventId}
        onClose={() => {
          setDetailOpen(false);
          setDetailEventId(null);
        }}
        onStatusChange={refetch}
      />

      <QuickTimeSearchModal
        open={quickSearchOpen}
        onClose={() => setQuickSearchOpen(false)}
        branchId={effectiveBranchId}
        barbers={barbers}
        services={services}
        onSelectSlot={({ barberId: b, startISO, endISO, serviceId }) => {
          setQuickSearchOpen(false);
          setSelectedStartISO(startISO);
          setPreselectedEndISO(endISO);
          setPreselectedBarberId(b);
          setPreselectedServiceId(serviceId);
          setNewOpen(true);
        }}
      />

      <SlotActionMenu
        open={slotMenuOpen}
        x={slotMenuPos.x}
        y={slotMenuPos.y}
        timeLabel={slotISO ? new Date(slotISO).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false }) : undefined}
        onClose={() => setSlotMenuOpen(false)}
        onReserve={() => {
          setSelectedStartISO(slotISO);
          setNewOpen(true);
        }}
        onBlock={() => {
          setBlockStartISO(slotISO);
          setBlockOpen(true);
        }}
      />

      {toast && (
        <div
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg transition-all ${
            toast.type === "error" ? "bg-red-600 text-white" : "bg-stone-800 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
