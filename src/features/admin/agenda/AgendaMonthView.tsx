"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { AgendaEvent } from "@/types/agenda";
import { STATUS_CONFIG } from "@/lib/constants";

/**
 * Vista mensual del agenda — grid de 6 semanas con eventos como pills.
 * Click en un día navega a vista Día de ese día.
 * Click en un evento abre el detalle.
 */
export default function AgendaMonthView({
  events,
  initialDate,
  onClickDay,
  onClickEvent,
}: {
  events: AgendaEvent[];
  initialDate?: string;
  onClickDay: (dateYYYYMMDD: string) => void;
  onClickEvent: (eventId: string) => void;
}) {
  // En vista mes solo mostramos APPOINTMENT (no BLOCK ni UNAVAILABLE que ensucian).
  const fcEvents = events
    .filter((e) => e.kind === "APPOINTMENT")
    .map((e) => {
      const cfg = STATUS_CONFIG[e.status as string] || STATUS_CONFIG.RESERVED;
      return {
        id: e.id,
        title: e.title.split("\n")[0], // solo nombre cliente en mes
        start: e.start,
        end: e.end,
        backgroundColor: cfg.color,
        borderColor: cfg.color,
        textColor: "#ffffff",
        extendedProps: { status: e.status, kind: e.kind },
      };
    });

  return (
    <div className="fc-wrapper fc-month-wrapper h-full">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={initialDate}
        locale="es"
        firstDay={1}
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        buttonText={{ today: "Hoy" }}
        height="100%"
        dayMaxEvents={4}
        moreLinkText={(n) => `+${n} más`}
        dayHeaderFormat={{ weekday: "short" }}
        events={fcEvents}
        dateClick={(info) => onClickDay(info.dateStr)}
        eventClick={(info) => onClickEvent(info.event.id)}
        eventDisplay="block"
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
      />
    </div>
  );
}
