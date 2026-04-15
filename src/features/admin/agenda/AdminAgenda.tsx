"use client";

import { useMemo, useState } from "react";
import AgendaCalendar from "./AgendaCalendar";
import AgendaBarberDayGrid from "./AgendaBarberDayGrid";
import AgendaSidebar from "./AgendaSidebar";
import AgendaViewToggle, { type AgendaViewMode } from "./AgendaViewToggle";
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
import PageTip from "@/components/ui/PageTip";
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

  // mobile sidebar
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

  // Cuando se filtra a 1 barbero en vista semana, muestra chip con X
  const singleSelectedBarber =
    viewMode === "week" && barberIds.length === 1
      ? barbers.find((b) => b.id === barberIds[0])
      : null;

  return (
    <div className="flex -mx-[var(--admin-pad-x,1rem)] -my-[var(--admin-pad-y,1rem)] min-h-[calc(100dvh-80px)]">
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
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="border-b border-[#e8e2dc] bg-white px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
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
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-stone-900 leading-tight truncate">
                {selectedDate.toLocaleDateString("es-CL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h1>
              <div className="text-xs text-stone-500 flex items-center gap-2 flex-wrap">
                <span>🏠 {branches.find((b) => b.id === effectiveBranchId)?.name || "—"}</span>
                {singleSelectedBarber && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: singleSelectedBarber.color || "#c87941" }}
                    />
                    {singleSelectedBarber.name}
                    <button
                      type="button"
                      onClick={() => setBarberIds([])}
                      className="ml-0.5 text-stone-400 hover:text-stone-700"
                      aria-label="Quitar filtro de barbero"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate(startOfDay(new Date()))}
              className="rounded-md border border-[#e8e2dc] bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-brand/40 transition"
            >
              Hoy
            </button>
            <div className="inline-flex rounded-md border border-[#e8e2dc] overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setSelectedDate(addDays(selectedDate, viewMode === "day" ? -1 : -7))
                }
                className="px-2 py-1.5 text-sm hover:bg-stone-50 transition"
                aria-label="Anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedDate(addDays(selectedDate, viewMode === "day" ? 1 : 7))
                }
                className="px-2 py-1.5 text-sm hover:bg-stone-50 transition border-l border-[#e8e2dc]"
                aria-label="Siguiente"
              >
                ›
              </button>
            </div>
            <AgendaViewToggle mode={viewMode} onChange={setViewMode} />
            <button
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover transition shadow-sm flex items-center gap-1"
              onClick={() => {
                const x = Math.min(window.innerWidth - 240, window.innerWidth - 260);
                setSlotMenuPos({ x, y: 140 });
                setSlotISO(new Date().toISOString());
                setSlotBarberId("");
                setSlotMenuOpen(true);
              }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 1v12M1 7h12" />
              </svg>
              Nuevo
            </button>
          </div>
        </div>

        <PageTip id="agenda" text="Haz clic en un horario vacío para crear una reserva rápida. Haz clic en un barbero para ver solo sus horarios." />

        {/* Calendar area */}
        <div className="flex-1 overflow-hidden bg-[#faf8f6]">
          {viewMode === "day" ? (
            <AgendaBarberDayGrid
              date={selectedDate}
              visibleRange={visibleRange}
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
