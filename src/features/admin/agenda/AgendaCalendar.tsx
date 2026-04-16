"use client";

import { useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { AgendaEvent, VisibleRange } from "@/types/agenda";
import { STATUS_CONFIG } from "@/lib/constants";

export type { AgendaEvent } from "@/types/agenda";

interface AgendaCalendarProps {
  events: AgendaEvent[];
  onSelectSlot: (info: { isoStart: string; x: number; y: number }) => void;
  onClickEvent: (eventId: string) => void;
  visibleRange?: VisibleRange;
  initialDate?: string; // ISO date
}

function eventStyle(event: AgendaEvent) {
  if (event.kind === "UNAVAILABLE") {
    return {
      backgroundColor: "#f5f5f4",
      borderColor: "#d6d3d1",
      textColor: "#a8a29e",
      display: "background" as const,
    };
  }
  if (event.kind === "BLOCK") {
    return {
      backgroundColor: "#e7e5e4",
      borderColor: "#a8a29e",
      textColor: "#57534e",
    };
  }
  const cfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.RESERVED;
  return {
    backgroundColor: cfg.color + "22", // tint
    borderColor: cfg.color,
    textColor: cfg.color,
  };
}

function isMobile() {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

function normalizeTime(hhmm: string | undefined, fallback: string): string {
  if (!hhmm) return fallback;
  // FullCalendar espera "HH:mm:ss"
  if (/^\d{2}:\d{2}$/.test(hhmm)) return `${hhmm}:00`;
  return hhmm;
}

export default function AgendaCalendar({
  events,
  onSelectSlot,
  onClickEvent,
  visibleRange,
  initialDate,
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

  // Cambia la fecha en el calendario cuando cambia initialDate desde fuera
  useEffect(() => {
    if (!initialDate) return;
    const api = calRef.current?.getApi();
    api?.gotoDate(initialDate);
  }, [initialDate]);

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
      display: e.kind === "UNAVAILABLE" ? "background" : undefined,
      extendedProps: { kind: e.kind, barberId: e.barberId, status: e.status },
    };
  });

  const mobile = isMobile();
  const slotMin = normalizeTime(visibleRange?.from, "09:00:00");
  const slotMax = normalizeTime(visibleRange?.to, "21:00:00");

  return (
    <div className="fc-wrapper overflow-x-auto h-full">
      <FullCalendar
        ref={calRef}
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView={mobile ? "timeGridDay" : "timeGridWeek"}
        initialDate={initialDate}
        locale="es"
        headerToolbar={
          mobile
            ? { left: "prev,next", center: "title", right: "today" }
            : { left: "prev,next today", center: "title", right: "timeGridWeek,timeGridDay" }
        }
        slotMinTime={slotMin}
        slotMaxTime={slotMax}
        slotDuration="00:30:00"
        scrollTime={slotMin}
        allDaySlot={false}
        nowIndicator={true}
        stickyHeaderDates={true}
        hiddenDays={[0]}
        height="100%"
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
          const kind = info.event.extendedProps?.kind;
          if (kind === "UNAVAILABLE") return;
          onClickEvent(info.event.id);
        }}
        eventContent={(arg) => {
          const lines = (arg.event.title || "").split("\n");
          const kind = arg.event.extendedProps?.kind as string;
          const status = arg.event.extendedProps?.status as string;

          if (kind === "UNAVAILABLE") {
            return (
              <div className="px-1 py-0.5 text-[9px] italic opacity-60 overflow-hidden h-full">
                Profesional no disponible
              </div>
            );
          }

          const cfg = kind === "BLOCK" ? null : STATUS_CONFIG[status];
          const dotClass =
            kind === "BLOCK"
              ? "bg-stone-400"
              : cfg?.dot ?? "bg-brand";

          return (
            <div className="px-1 py-0.5 text-[10px] leading-tight overflow-hidden cursor-pointer h-full">
              <div className="flex items-center gap-1">
                <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${dotClass}`} />
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
