"use client";

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg } from "@fullcalendar/core";

export type AgendaEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: "APPOINTMENT" | "BLOCK";
  barberId: string;
  status: "ACTIVE" | "CANCELED" | "DONE";
};

export default function AgendaCalendar({
  events,
  onSelectSlot,
  onClickEvent,
}: {
  events: AgendaEvent[];
  onSelectSlot: (args: { isoStart: string; x: number; y: number }) => void;
  onClickEvent: (eventId: string) => void;
}) {
  return (
    <div className="agenda-calendar">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        height="auto"
        contentHeight="auto"
        expandRows={true}
        allDaySlot={false}
        slotMinTime="09:00:00"
        slotMaxTime="19:00:00"
        nowIndicator={true}
        selectable={true}
        selectMirror={true}
        select={(info: DateSelectArg) => {
          // posición para abrir menú contextual tipo AgendaPro
          const jsEvent = info.jsEvent as unknown as MouseEvent | undefined;
          const x = jsEvent?.clientX ?? 240;
          const y = jsEvent?.clientY ?? 160;
          onSelectSlot({ isoStart: info.startStr, x, y });
        }}
        eventClick={(info: EventClickArg) => {
          onClickEvent(info.event.id);
        }}
        headerToolbar={{
          left: "prev,next",
          center: "title",
          right: "today timeGridWeek,timeGridDay",
        }}
        buttonText={{
          today: "Hoy",
          week: "Semana",
          day: "Día",
        }}
        dayHeaderFormat={{
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
        }}
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        locale="es"
        weekends={true}
        events={events.map((e) => ({
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          classNames: [e.kind === "BLOCK" ? "evt-block" : "evt-apt"],
        }))}
      />

      {/* Estilo tipo AgendaPro */}
      <style jsx global>{`
        /* ===== Layout base ===== */
        .agenda-calendar .fc {
          font-size: 12px;
          color: #111827;
        }

        /* Contenedor con borde suave */
        .agenda-calendar .fc .fc-view-harness {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
          background: #fff;
        }

        /* ===== Toolbar ===== */
        .agenda-calendar .fc .fc-toolbar {
          padding: 10px 12px;
          margin: 0;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .agenda-calendar .fc .fc-toolbar-title {
          font-size: 14px;
          font-weight: 700;
          color: #111827;
        }

        .agenda-calendar .fc .fc-button {
          border: 1px solid #e5e7eb !important;
          background: #fff !important;
          color: #111827 !important;
          border-radius: 8px !important;
          padding: 6px 10px !important;
          font-weight: 600 !important;
          box-shadow: 0 1px 0 rgba(17, 24, 39, 0.04);
        }

        .agenda-calendar .fc .fc-button:hover {
          background: #f3f4f6 !important;
        }

        .agenda-calendar .fc .fc-button:focus {
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.25) !important;
        }

        .agenda-calendar .fc .fc-button.fc-button-active {
          background: #111827 !important;
          color: #fff !important;
          border-color: #111827 !important;
        }

        /* ===== Header de días ===== */
        .agenda-calendar .fc .fc-col-header-cell {
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
        }

        .agenda-calendar .fc .fc-col-header-cell-cushion {
          padding: 10px 6px;
          font-weight: 700;
          text-transform: capitalize;
          color: #111827;
        }

        /* ===== Columna de horas ===== */
        .agenda-calendar .fc .fc-timegrid-axis {
          background: #f9fafb;
          border-right: 1px solid #e5e7eb;
        }

        .agenda-calendar .fc .fc-timegrid-slot-label {
          color: #6b7280;
          font-weight: 600;
        }

        /* ===== Grilla ===== */
        .agenda-calendar .fc .fc-timegrid-slot {
          border-color: #eef2f7;
        }
        .agenda-calendar .fc .fc-timegrid-slot-minor {
          border-color: #f3f4f6;
        }
        .agenda-calendar .fc .fc-scrollgrid {
          border: none;
        }

        /* ===== Día actual ===== */
        .agenda-calendar .fc .fc-day-today {
          background: #fff7ed !important; /* suave */
        }

        /* ===== Now indicator ===== */
        .agenda-calendar .fc .fc-now-indicator-line {
          border-color: #ef4444 !important;
        }
        .agenda-calendar .fc .fc-now-indicator-arrow {
          border-color: #ef4444 !important;
        }

        /* ===== Eventos ===== */
        .agenda-calendar .fc .fc-event {
          border: none !important;
          border-radius: 8px !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .agenda-calendar .fc .fc-event:hover {
          filter: brightness(0.97);
        }

        .agenda-calendar .fc .fc-event-main {
          padding: 6px 8px;
          line-height: 1.2;
        }

        .agenda-calendar .fc .fc-event-time {
          font-size: 11px;
          opacity: 0.9;
          font-weight: 700;
        }

        .agenda-calendar .fc .fc-event-title {
          font-weight: 700;
          white-space: pre-line;
          margin-top: 2px;
        }

        /* Colores tipo AgendaPro */
        .evt-apt {
          background: #2563eb !important;
          color: #fff !important;
        }

        .evt-block {
          background: #94a3b8 !important;
          color: #111827 !important;
        }
      `}</style>
    </div>
  );
}
