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
  clientName?: string;
  clientPhone?: string | null;
  serviceName?: string;
  serviceDuration?: number;
  price?: number;
  notePublic?: string | null;
};

interface BarberCalendarProps {
  events: CalendarEvent[];
  onSelectSlot: (info: { isoStart: string; isoEnd: string }) => void;
  onClickEvent: (event: CalendarEvent) => void;
  onRangeChange: (from: string, to: string) => void;
}

function eventStyle(event: CalendarEvent) {
  if (event.kind === "BLOCK") {
    return { backgroundColor: "#f8f8f7", borderColor: "#d6d3d1", textColor: "#78716c" };
  }
  if (event.status === "DONE") {
    return { backgroundColor: "#f0fdf4", borderColor: "#86efac", textColor: "#15803d" };
  }
  if (event.status === "CANCELED") {
    return { backgroundColor: "#fef2f2", borderColor: "#fca5a5", textColor: "#b91c1c" };
  }
  if (event.status === "NO_SHOW") {
    return { backgroundColor: "#fff7ed", borderColor: "#fdba74", textColor: "#c2410c" };
  }
  return { backgroundColor: "#fef0e2", borderColor: "#c87941", textColor: "#78350f" };
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
        height="calc(100dvh - 130px)"
        expandRows={true}
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
          const isBlock = arg.event.extendedProps?.kind === "BLOCK";
          const lines = (arg.event.title || "").split("\n");
          const status = arg.event.extendedProps?.status as string;
          const dotColor = isBlock
            ? "#a8a29e"
            : status === "DONE"
              ? "#22c55e"
              : status === "CANCELED" || status === "NO_SHOW"
                ? "#ef4444"
                : "#c87941";

          return (
            <div className="px-1 py-0.5 text-[10px] leading-tight overflow-hidden cursor-pointer h-full">
              <div className="flex items-center gap-1">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: dotColor }}
                />
                <span className="font-semibold truncate">{lines[0]}</span>
              </div>
              {lines[1] && (
                <div className="truncate opacity-60 pl-2.5 text-[9px]">{lines[1]}</div>
              )}
            </div>
          );
        }}
        buttonText={{ today: "Hoy", week: "Semana", day: "Día" }}
      />
    </div>
  );
}
