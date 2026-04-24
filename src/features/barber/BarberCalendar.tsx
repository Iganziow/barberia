"use client";

import { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: "APPOINTMENT" | "BLOCK";
  status?: string;
  // Extended data for detail panel
  clientId?: string;
  clientName?: string;
  clientPhone?: string | null;
  serviceName?: string;
  serviceDuration?: number;
  price?: number;
  notePublic?: string | null;
  noteInternal?: string | null;
  paid?: boolean;
};

interface BarberCalendarProps {
  events: CalendarEvent[];
  onSelectSlot: (info: { isoStart: string; isoEnd: string }) => void;
  onClickEvent: (event: CalendarEvent) => void;
  onRangeChange: (from: string, to: string) => void;
}

function eventStyle(event: CalendarEvent) {
  if (event.kind === "BLOCK") {
    return { backgroundColor: "#e7e5e4", borderColor: "#a8a29e", textColor: "#57534e" };
  }
  if (event.status === "DONE") {
    return { backgroundColor: "#dcfce7", borderColor: "#22c55e", textColor: "#166534" };
  }
  if (event.status === "CANCELED") {
    return { backgroundColor: "#fee2e2", borderColor: "#ef4444", textColor: "#991b1b" };
  }
  if (event.status === "NO_SHOW") {
    return { backgroundColor: "#ffedd5", borderColor: "#f97316", textColor: "#9a3412" };
  }
  // Active/reserved — brand warm orange
  return { backgroundColor: "#fde8d0", borderColor: "#c87941", textColor: "#6b2f0a" };
}

function isMobile() {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

export default function BarberCalendar({
  events,
  onSelectSlot,
  onClickEvent,
  onRangeChange,
}: BarberCalendarProps) {
  const calRef = useRef<FullCalendar>(null);
  const mobile = isMobile();

  const fcEvents = events.map((e) => {
    const colors = eventStyle(e);
    return {
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      ...colors,
      extendedProps: { kind: e.kind, status: e.status, _original: e },
    };
  });

  return (
    <div className="fc-wrapper -mx-4">
      <FullCalendar
        ref={calRef}
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView={mobile ? "timeGridDay" : "timeGridWeek"}
        locale="es"
        headerToolbar={
          mobile
            ? { left: "prev,next", center: "title", right: "today" }
            : { left: "prev,next today", center: "title", right: "timeGridWeek,timeGridDay" }
        }
        slotMinTime="09:00:00"
        slotMaxTime="21:00:00"
        slotDuration="00:30:00"
        scrollTime="09:00:00"
        allDaySlot={false}
        nowIndicator={true}
        stickyHeaderDates={true}
        // Antes height era calc(100dvh - 160px) fijo — con el agregado
        // de stats cards arriba, el cálculo quedaba corto y el scroll
        // interno no alcanzaba a mostrar las últimas horas. Ahora el
        // calendario crece según su contenido y la página scrollea
        // verticalmente como en el resto del admin.
        height="auto"
        contentHeight="auto"
        expandRows={false}
        hiddenDays={[0]}
        events={fcEvents}
        selectable={true}
        selectMirror={true}
        select={(info) => {
          onSelectSlot({ isoStart: info.startStr, isoEnd: info.endStr });
          calRef.current?.getApi().unselect();
        }}
        eventClick={(info) => {
          const original = info.event.extendedProps._original as CalendarEvent;
          onClickEvent(original);
        }}
        datesSet={(info) => {
          onRangeChange(info.startStr, info.endStr);
        }}
        eventContent={(arg) => {
          const lines = (arg.event.title || "").split("\n");

          return (
            <div className="px-1.5 py-1 text-[11px] leading-snug overflow-hidden cursor-pointer h-full">
              <div className="font-bold truncate">{lines[0]}</div>
              {lines[1] && (
                <div className="truncate opacity-70 text-[10px] mt-0.5">{lines[1]}</div>
              )}
            </div>
          );
        }}
        buttonText={{ today: "Hoy", week: "Semana", day: "Día" }}
      />
    </div>
  );
}
