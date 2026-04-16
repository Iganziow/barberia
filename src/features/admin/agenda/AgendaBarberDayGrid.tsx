"use client";

import { useMemo } from "react";
import type { AgendaEvent, BarberOption, VisibleRange } from "@/types/agenda";
import { STATUS_CONFIG } from "@/lib/constants";
import {
  SLOT_MINUTES,
  eventGridRows,
  gridRowCount,
  timeLabels,
} from "./agendaGridMath";

const ROW_HEIGHT = 20; // px por slot de 15min — antes 14, ahora más legible

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatHHmm(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Vista día con barberos como columnas (inspirado en Agenda Pro).
 * - Click en header del barbero: switch a vista semana filtrada a ese barbero.
 * - Click en slot vacío: abre menú contextual.
 * - Click en evento APPOINTMENT: abre detalle.
 * - Bloques UNAVAILABLE / BLOCK se dibujan sin interactividad extra (el BLOCK sí se puede clickear para editar).
 */
export default function AgendaBarberDayGrid({
  date,
  visibleRange,
  barbers,
  events,
  onSelectSlot,
  onClickEvent,
  onClickBarberHeader,
}: {
  date: Date;
  visibleRange: VisibleRange;
  barbers: BarberOption[];
  events: AgendaEvent[];
  onSelectSlot: (info: {
    isoStart: string;
    barberId: string;
    x: number;
    y: number;
  }) => void;
  onClickEvent: (eventId: string) => void;
  onClickBarberHeader: (barberId: string) => void;
}) {
  const dayStart = useMemo(() => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [date]);

  const rowCount = gridRowCount(visibleRange);
  const labels = useMemo(() => timeLabels(visibleRange), [visibleRange]);

  // Eventos por barbero, filtrados al día visible
  const eventsByBarber = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const b of barbers) map.set(b.id, []);
    for (const e of events) {
      const start = new Date(e.start);
      if (!sameDay(start, dayStart)) {
        // Permitir eventos que abarcan el día (UNAVAILABLE típicamente)
        const end = new Date(e.end);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        if (end < dayStart || start > dayEnd) continue;
      }
      const bucket = map.get(e.barberId);
      if (bucket) bucket.push(e);
    }
    return map;
  }, [events, barbers, dayStart]);

  // Línea "ahora" si el día mostrado es hoy
  const nowLineRow = useMemo(() => {
    const now = new Date();
    if (!sameDay(now, dayStart)) return null;
    const minutes = now.getHours() * 60 + now.getMinutes();
    const [fh, fm] = visibleRange.from.split(":").map(Number);
    const [th, tm] = visibleRange.to.split(":").map(Number);
    const visFrom = fh * 60 + fm;
    const visTo = th * 60 + tm;
    if (minutes < visFrom || minutes > visTo) return null;
    return (minutes - visFrom) / SLOT_MINUTES + 1;
  }, [dayStart, visibleRange]);

  if (rowCount <= 0) {
    return (
      <div className="p-10 text-center text-sm text-stone-500">
        El rango horario visible es inválido.
      </div>
    );
  }

  function handleSlotClick(
    e: React.MouseEvent<HTMLButtonElement>,
    barberId: string,
    rowIndex: number
  ) {
    const rect = e.currentTarget.getBoundingClientRect();
    const [fh, fm] = visibleRange.from.split(":").map(Number);
    const minutes = fh * 60 + fm + rowIndex * SLOT_MINUTES;
    const slotDate = new Date(dayStart);
    slotDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    onSelectSlot({
      isoStart: slotDate.toISOString(),
      barberId,
      x: rect.left,
      y: rect.top,
    });
  }

  // Ancho de columna adaptativo según la cantidad de barberos:
  // - 1–3 barberos: llenan todo el contenedor (sin mínimo).
  // - 4–6 barberos: min 150px → puede aparecer scroll en pantallas angostas.
  // - 7–9 barberos: min 130px.
  // - 10+ barberos: min 110px (scroll siempre presente).
  const n = barbers.length;
  const minColWidth = n <= 3 ? 0 : n <= 6 ? 150 : n <= 9 ? 130 : 110;
  // Scroll horizontal si el ancho mínimo total excede cualquier viewport razonable.
  const useScroll = n >= 5;

  return (
    <div
      className={`relative h-full w-full ${useScroll ? "overflow-auto scroll-shadow-x" : "overflow-y-auto overflow-x-hidden"}`}
      data-barber-count={n}
    >
      <div
        className={`grid ${useScroll ? "min-w-max" : "w-full"}`}
        style={{
          gridTemplateColumns: `56px repeat(${Math.max(n, 1)}, minmax(${minColWidth}px, 1fr))`,
        }}
      >
        {/* Header: empty corner + barber headers */}
        <div className="sticky top-0 z-20 bg-white border-b border-[#e8e2dc] h-14" />
        {barbers.map((b) => {
          // Con muchos barberos, las columnas son angostas: ocultamos el nombre
          // y dejamos solo el avatar; el nombre aparece en el tooltip nativo.
          const compact = n >= 7;
          return (
            <div
              key={`h-${b.id}`}
              className="sticky top-0 z-20 bg-white border-b border-l border-[#e8e2dc] h-14 flex items-center justify-center min-w-0"
            >
              <button
                type="button"
                onClick={() => onClickBarberHeader(b.id)}
                className="group flex items-center gap-2 px-2 py-1 rounded-full hover:bg-stone-50 transition min-w-0 max-w-full"
                title={`Ver semana de ${b.name}`}
              >
                <div
                  className="h-7 w-7 rounded-full grid place-items-center text-white text-[10px] font-bold shadow-sm ring-2 ring-white shrink-0"
                  style={{ backgroundColor: b.color || "#c87941" }}
                >
                  {b.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                {!compact && (
                  <span className="text-[13px] font-semibold text-stone-700 group-hover:text-stone-900 truncate">
                    {b.name}
                  </span>
                )}
              </button>
            </div>
          );
        })}

        {/* Body */}
        {/* Left time column */}
        <div
          className="relative bg-white border-r border-[#e8e2dc]"
          style={{ gridRow: `2 / span 1` }}
        >
          <div
            className="grid"
            style={{
              gridTemplateRows: `repeat(${rowCount}, ${ROW_HEIGHT}px)`,
            }}
          >
            {labels.map((l) => (
              <div
                key={l.label}
                className={`pr-1 text-right text-[10px] leading-none flex items-start justify-end ${
                  l.onTheHour ? "text-stone-500 font-medium" : "text-transparent"
                }`}
                style={{ gridRow: `${l.row} / span 1`, paddingTop: 0 }}
              >
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Barber columns */}
        {barbers.map((b) => {
          const colEvents = eventsByBarber.get(b.id) ?? [];
          return (
            <div
              key={`col-${b.id}`}
              className="relative border-l border-[#e8e2dc] bg-white"
              style={{ gridRow: `2 / span 1` }}
            >
              <div
                className="grid relative"
                style={{
                  gridTemplateRows: `repeat(${rowCount}, ${ROW_HEIGHT}px)`,
                }}
              >
                {/* Background clickable slots */}
                {Array.from({ length: rowCount }).map((_, idx) => (
                  <button
                    key={`slot-${b.id}-${idx}`}
                    type="button"
                    onClick={(e) => handleSlotClick(e, b.id, idx)}
                    className={`text-left ${
                      idx % 4 === 0
                        ? "border-t border-stone-200"
                        : idx % 2 === 0
                          ? "border-t border-stone-100"
                          : ""
                    } hover:bg-brand/5 transition`}
                    style={{ gridRow: `${idx + 1} / span 1` }}
                    aria-label={`Crear evento en slot ${idx}`}
                  />
                ))}

                {/* Events */}
                {colEvents.map((e) => {
                  const rows = eventGridRows(e.start, e.end, dayStart, visibleRange);
                  if (!rows) return null;

                  if (e.kind === "UNAVAILABLE") {
                    return (
                      <div
                        key={e.id}
                        className="mx-0.5 rounded-md bg-stone-100/80 border border-dashed border-stone-300 text-[10px] text-stone-500 p-1.5 pointer-events-none select-none"
                        style={{
                          gridRow: `${rows.startRow} / ${rows.endRow}`,
                        }}
                      >
                        <div className="opacity-80">Profesional no disponible</div>
                        <div className="text-[9px] opacity-60">
                          {formatHHmm(e.start)} – {formatHHmm(e.end)}
                        </div>
                      </div>
                    );
                  }

                  if (e.kind === "BLOCK") {
                    return (
                      <button
                        type="button"
                        key={e.id}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onClickEvent(e.id);
                        }}
                        className="text-left mx-0.5 rounded-md bg-stone-200 border-l-4 border-stone-400 text-[10px] text-stone-700 p-1.5 hover:shadow-sm transition"
                        style={{
                          gridRow: `${rows.startRow} / ${rows.endRow}`,
                        }}
                      >
                        <div className="font-medium flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5 5V3a3 3 0 0 1 6 0v2h1v9H4V5zm2 0h2V3a1 1 0 0 0-2 0z" />
                          </svg>
                          {e.title}
                        </div>
                        <div className="text-[9px] opacity-70">
                          {formatHHmm(e.start)} – {formatHHmm(e.end)}
                        </div>
                      </button>
                    );
                  }

                  // APPOINTMENT
                  const cfg = STATUS_CONFIG[e.status] || STATUS_CONFIG.RESERVED;
                  const [title, subtitle] = e.title.split("\n");
                  const spanRows = rows.endRow - rows.startRow;
                  const isTall = spanRows >= 3; // ≥ 45min at ROW_HEIGHT=20
                  return (
                    <button
                      type="button"
                      key={e.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onClickEvent(e.id);
                      }}
                      title={`${title} · ${subtitle || ""}\n${formatHHmm(e.start)} – ${formatHHmm(e.end)} · ${cfg.label}${e.paid ? " · Pagado" : ""}`}
                      className={`group/card text-left mx-0.5 rounded-lg ${cfg.bg} border-l-[3px] ${cfg.text} px-2 py-1 hover:shadow-lg hover:-translate-y-px transition-all overflow-hidden cursor-pointer`}
                      style={{
                        gridRow: `${rows.startRow} / ${rows.endRow}`,
                        borderLeftColor: cfg.color,
                      }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`h-2 w-2 rounded-full ${cfg.dot} shrink-0 ring-1 ring-white`}
                        />
                        <span className="font-semibold text-[11px] truncate flex-1">{title}</span>
                        {/* Indicador pagado */}
                        {e.paid && (
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 text-emerald-500" aria-label="Pagado">
                            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.7 5.3a.5.5 0 010 .7l-4 4a.5.5 0 01-.7 0l-2-2a.5.5 0 01.7-.7L7.3 10l3.7-3.7a.5.5 0 01.7 0z" />
                          </svg>
                        )}
                        {!e.paid && e.status === "DONE" && (
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 text-amber-500" aria-label="Sin pago">
                            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.5 3a.5.5 0 011 0v4a.5.5 0 01-1 0V4zm.5 7a.6.6 0 110-1.2.6.6 0 010 1.2z" />
                          </svg>
                        )}
                      </div>
                      {isTall && subtitle && (
                        <div className="text-[10px] opacity-70 truncate mt-0.5 pl-3.5">
                          {subtitle}
                        </div>
                      )}
                      {isTall && (
                        <div className="text-[9px] opacity-50 mt-0.5 pl-3.5 tabular-nums">
                          {formatHHmm(e.start)} – {formatHHmm(e.end)}
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Now line */}
                {nowLineRow !== null && (
                  <div
                    className="absolute left-0 right-0 pointer-events-none z-10"
                    style={{
                      top: `${(nowLineRow - 1) * ROW_HEIGHT}px`,
                    }}
                  >
                    <div className="relative h-0 border-t-2 border-red-500">
                      <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
