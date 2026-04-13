"use client";

import { useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { AgendaEvent } from "@/types/agenda";

export type { AgendaEvent } from "@/types/agenda";

interface AgendaCalendarProps {
  events: AgendaEvent[];
  onSelectSlot: (info: { isoStart: string; x: number; y: number }) => void;
  onClickEvent: (eventId: string) => void;
}

function eventStyle(event: AgendaEvent) {
  if (event.kind === "BLOCK") {
    return { backgroundColor: "#f8f8f7", borderColor: "#d6d3d1", textColor: "#78716c" };
  }
  if (event.status === "CANCELED") {
    return { backgroundColor: "#fef2f2", borderColor: "#fca5a5", textColor: "#b91c1c" };
  }
  if (event.status === "DONE") {
    return { backgroundColor: "#f0fdf4", borderColor: "#86efac", textColor: "#15803d" };
  }
  return {
    backgroundColor: "#fef0e2",
    borderColor: "#c87941",
    textColor: "#78350f",
  };
}

function isMobile() {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

export default function AgendaCalendar({
  events,
  onSelectSlot,
  onClickEvent,
}: AgendaCalendarProps) {
  const calRef = useRef<FullCalendar>(null);

  useEffect(() => {
    function handleResize() {
      const api = calRef.current?.getApi();
      if (!api) return;
      const current = api.view.type;
      const shouldBeDay = window.innerWidth < 768;
      if (shouldBeDay && current !== "timeGridDay") {
        api.changeView("timeGridDay");
      } else if (!shouldBeDay && current !== "timeGridWeek") {
        api.changeView("timeGridWeek");
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fcEvents = events.map((e) => {
    const colors = eventStyle(e);
    return {
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      backgroundColor: colors.backgroundColor,
      borderColor: colors.borderColor,
      textColor: colors.textColor,
      extendedProps: { kind: e.kind, barberId: e.barberId, status: e.status },
    };
  });

  const mobile = isMobile();

  return (
    <div className="fc-wrapper overflow-x-auto">
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
        hiddenDays={[0]}
        height="calc(100dvh - 185px)"
        expandRows={true}
        events={fcEvents}
        editable={false}
        selectable={false}
        dateClick={(info) => {
          const rect = (info.jsEvent.target as HTMLElement).getBoundingClientRect();
          onSelectSlot({
            isoStart: info.dateStr,
            x: rect.left,
            y: rect.top,
          });
        }}
        eventClick={(info) => {
          onClickEvent(info.event.id);
        }}
        eventContent={(arg) => {
          const lines = (arg.event.title || "").split("\n");
          const isBlock = arg.event.extendedProps?.kind === "BLOCK";
          const status = arg.event.extendedProps?.status as string;

          // Status indicator dot
          const dotColor = isBlock
            ? "#a8a29e"
            : status === "DONE"
              ? "#22c55e"
              : status === "CANCELED"
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
        buttonText={{
          today: "Hoy",
          week: "Semana",
          day: "Día",
        }}
      />
    </div>
  );
}
