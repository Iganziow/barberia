"use client";

import { useMemo, useState } from "react";
import AgendaFilters from "./AgendaFilters";
import AgendaCalendar from "./AgendaCalendar";
import NewReservationModal from "./NewReservationModal";
import BlockTimeModal from "./BlockTimeModal";
import SlotActionMenu from "./SlotActionMenu";
import AppointmentDetailModal from "./AppointmentDetailModal";
import { useBarbers } from "@/hooks/use-barbers";
import { useServices } from "@/hooks/use-services";
import { useBranches } from "@/hooks/use-branches";
import { useAgendaEvents } from "@/hooks/use-agenda-events";
import PageTip from "@/components/ui/PageTip";

export default function AdminAgenda() {
  // filtros
  const [branchId, setBranchId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "ALL">("ACTIVE");

  // datos reales desde API
  const { branches } = useBranches();

  // Derive effective branchId — auto-selects first branch if none set
  const effectiveBranchId = branchId || (branches.length > 0 ? branches[0].id : "");

  const { barbers } = useBarbers(effectiveBranchId || undefined);
  const { services } = useServices();
  const { events, refetch } = useAgendaEvents({
    branchId: effectiveBranchId || undefined,
    barberId: barberId || undefined,
  });

  // modal reserva
  const [newOpen, setNewOpen] = useState(false);
  const [selectedStartISO, setSelectedStartISO] = useState<string | null>(null);

  // modal bloqueo
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockStartISO, setBlockStartISO] = useState<string | null>(null);

  // modal detalle cita
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEventId, setDetailEventId] = useState<string | null>(null);

  // menú contextual slot
  const [slotMenuOpen, setSlotMenuOpen] = useState(false);
  const [slotMenuPos, setSlotMenuPos] = useState({ x: 240, y: 160 });
  const [slotISO, setSlotISO] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (barberId && e.barberId !== barberId) return false;
      if (status === "ACTIVE" && e.status !== "ACTIVE") return false;
      return true;
    });
  }, [events, barberId, status]);

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

  return (
    <div className="space-y-4">
      {/* Header row: title + filters + new button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">Agenda</h1>
          <p className="text-sm text-stone-500">Visualiza y gestiona las reservas del día</p>
        </div>
        <div className="flex items-center gap-2" data-tour-id="new-button">
          <button
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition shadow-sm"
            onClick={() => {
              const x = Math.min(window.innerWidth - 240, window.innerWidth - 260);
              setSlotMenuPos({ x, y: 140 });
              setSlotISO(new Date().toISOString());
              setSlotMenuOpen(true);
            }}
          >
            + Nueva reserva
          </button>
        </div>
      </div>

      <PageTip id="agenda" text="Haz clic en un horario vacío del calendario para crear una reserva rápida. También puedes usar el botón '+ Nueva reserva'." />

      {/* Filters inline */}
      <AgendaFilters
        branches={branches}
        barbers={barbers}
        branchId={effectiveBranchId}
        barberId={barberId}
        status={status}
        onChangeBranch={setBranchId}
        onChangeBarber={setBarberId}
        onChangeStatus={setStatus}
      />

      {/* Calendar */}
      <section className="rounded-xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden" data-tour-id="agenda-calendar">
        <div className="p-3">
          <AgendaCalendar
            events={filteredEvents}
            onSelectSlot={({ isoStart, x, y }) => {
              setSlotISO(isoStart);
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
      </section>

      <NewReservationModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        startISO={selectedStartISO}
        barberId={barberId || (barbers[0]?.id ?? "")}
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
          defaultBarberId={barberId || (barbers[0]?.id ?? "")}
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

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg transition-all ${
          toast.type === "error"
            ? "bg-red-600 text-white"
            : "bg-stone-800 text-white"
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
