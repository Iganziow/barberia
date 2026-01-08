"use client";

import { useMemo, useState } from "react";
import AgendaFilters from "./AgendaFilters";
import AgendaCalendar, { AgendaEvent } from "./AgendaCalendar";
import NewReservationModal from "./NewReservationModal";
import BlockTimeModal from "./BlockTimeModal";
import SlotActionMenu from "./SlotActionMenu";

const INITIAL_EVENTS: AgendaEvent[] = [
  {
    id: "apt-1",
    title: "Juan Pérez\nCorte de Cabello",
    start: "2025-12-31T13:00:00",
    end: "2025-12-31T14:00:00",
    kind: "APPOINTMENT",
    barberId: "barber-1",
    status: "ACTIVE",
  },
  {
    id: "blk-1",
    title: "Bloqueado",
    start: "2025-12-30T10:00:00",
    end: "2025-12-30T11:00:00",
    kind: "BLOCK",
    barberId: "barber-1",
    status: "ACTIVE",
  },
];

export default function AdminAgenda() {
  // filtros
  const [branchId, setBranchId] = useState("branch-1");
  const [barberId, setBarberId] = useState("barber-1");
  const [status, setStatus] = useState<"ACTIVE" | "ALL">("ACTIVE");

  // eventos
  const [events, setEvents] = useState<AgendaEvent[]>(INITIAL_EVENTS);

  // modal reserva
  const [newOpen, setNewOpen] = useState(false);
  const [selectedStartISO, setSelectedStartISO] = useState<string | null>(null);

  // modal bloqueo
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockStartISO, setBlockStartISO] = useState<string | null>(null);

  // menú contextual slot (Reserva / Bloquear)
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

  return (
    <div className="space-y-5">
      {/* ✅ ÚNICO header del módulo Agenda */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Agenda
          </h1>
          <p className="text-sm text-gray-500">
            Vista semanal tipo AgendaPro
          </p>
        </div>

        {/* ✅ Botón principal */}
        <div className="flex items-center gap-2">
          <button
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            onClick={() => {
              // “Nuevo” abre el menú en un lugar seguro (no al borde)
              const x = Math.min(window.innerWidth - 240, window.innerWidth - 260);
              const y = 140; // cerca del header, fijo
              setSlotMenuPos({ x, y });
              setSlotISO(new Date().toISOString());
              setSlotMenuOpen(true);
            }}
          >
            Nuevo <span className="opacity-90">▾</span>
          </button>
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        {/* Panel izquierdo */}
        <section className="rounded-2xl border bg-white shadow-sm h-fit overflow-hidden">
          <div className="border-b px-5 py-4">
            <div className="text-sm font-semibold text-gray-900">Filtros</div>
            <div className="text-xs text-gray-500">
              Sucursal / Profesional / Estado
            </div>
          </div>

          <div className="p-5">
            <AgendaFilters
              branchId={branchId}
              barberId={barberId}
              status={status}
              onChangeBranch={setBranchId}
              onChangeBarber={setBarberId}
              onChangeStatus={setStatus}
            />
          </div>
        </section>

        {/* Calendario */}
        <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="p-3">
            <AgendaCalendar
              events={filteredEvents}
              onSelectSlot={({ isoStart, x, y }) => {
                setSlotISO(isoStart);
                setSlotMenuPos({ x, y });
                setSlotMenuOpen(true);
              }}
              onClickEvent={(eventId) => {
                alert(`TODO: detalle de evento ${eventId}`);
              }}
            />
          </div>
        </section>
      </div>

      {/* Modales */}
      <NewReservationModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        startISO={selectedStartISO}
        barberId={barberId}
        existingEvents={events}
        onCreate={({ customerName, startISO, endISO, barberId }) => {
          setEvents((prev) => [
            ...prev,
            {
              id: `apt-${Date.now()}`,
              title: `${customerName}\nReserva`,
              start: startISO,
              end: endISO,
              kind: "APPOINTMENT",
              barberId,
              status: "ACTIVE",
            },
          ]);
        }}
      />

      <BlockTimeModal
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        startISO={blockStartISO}
        defaultBarberId={barberId}
        existingEvents={events}
        onCreateMany={(blocks) => {
          setEvents((prev) => [
            ...prev,
            ...blocks.map((b) => ({
              id: `blk-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              title: b.reason,
              start: b.startISO,
              end: b.endISO,
              kind: "BLOCK" as const,
              barberId: b.barberId,
              status: "ACTIVE" as const,
            })),
          ]);
        }}
      />

      {/* Menú contextual */}
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
    </div>
  );
}
