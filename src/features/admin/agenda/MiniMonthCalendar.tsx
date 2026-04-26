"use client";

import { useMemo, useState } from "react";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DAY_HEADERS = ["L", "M", "X", "J", "V", "S", "D"];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function IconChev() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function IconArrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {dir === "left" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  );
}

/**
 * Mini calendario mensual. Lunes-primero.
 * Header con dropdowns nativos (Mes / Año) — patrón Agenda Pro.
 *
 * Modo CONTROLADO (opcional): pasa `cursorMonth` + `onCursorChange` y el
 * cursor lo maneja el padre — útil para sincronizar dos minis o
 * sincronizar con el calendario principal.
 *
 * Modo NO CONTROLADO (default): cada mini maneja su propio cursor
 * interno con el `initialMonth` (o `selectedDate` si no se pasa).
 */
export default function MiniMonthCalendar({
  selectedDate,
  onSelectDate,
  initialMonth,
  cursorMonth,
  onCursorChange,
}: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  initialMonth?: Date;
  cursorMonth?: Date;
  onCursorChange?: (next: Date) => void;
}) {
  const isControlled = cursorMonth !== undefined && onCursorChange !== undefined;

  const [internalCursor, setInternalCursor] = useState(() => {
    const ref = initialMonth ?? selectedDate;
    return new Date(ref.getFullYear(), ref.getMonth(), 1);
  });

  // Memo del cursor para que las dependencias del useMemo del grid sean
  // estables (resuelve el warning react-hooks/exhaustive-deps).
  const cursor = useMemo(() => {
    if (isControlled && cursorMonth) {
      return new Date(cursorMonth.getFullYear(), cursorMonth.getMonth(), 1);
    }
    return internalCursor;
  }, [isControlled, cursorMonth, internalCursor]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const grid = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const firstDow = (firstOfMonth.getDay() + 6) % 7;

    const days: Array<{ date: Date; currentMonth: boolean }> = [];

    for (let i = firstDow - 1; i >= 0; i--) {
      const d = new Date(firstOfMonth);
      d.setDate(d.getDate() - (i + 1));
      days.push({ date: d, currentMonth: false });
    }

    const daysInMonth = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0
    ).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(cursor.getFullYear(), cursor.getMonth(), i),
        currentMonth: true,
      });
    }

    while (days.length % 7 !== 0) {
      const last = days[days.length - 1].date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      days.push({ date: d, currentMonth: false });
    }

    return days;
  }, [cursor]);

  function setCursor(next: Date) {
    if (isControlled) {
      onCursorChange!(next);
    } else {
      setInternalCursor(next);
    }
  }

  function shiftMonth(delta: number) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  }

  function pickMonth(monthIdx: number) {
    setCursor(new Date(cursor.getFullYear(), monthIdx, 1));
  }

  function pickYear(year: number) {
    setCursor(new Date(year, cursor.getMonth(), 1));
  }

  // Rango de años: 5 atrás y 5 adelante respecto del año actual del cursor
  const yearRange = useMemo(() => {
    const base = cursor.getFullYear();
    const arr: number[] = [];
    for (let y = base - 5; y <= base + 5; y++) arr.push(y);
    return arr;
  }, [cursor]);

  return (
    <div className="text-xs">
      {/* Header con flecha < / dropdowns mes+año / flecha > */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="grid h-7 w-7 place-items-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition shrink-0"
          aria-label="Mes anterior"
        >
          <IconArrow dir="left" />
        </button>

        <div className="flex items-center gap-1.5 flex-1 justify-center">
          {/* Dropdown de mes */}
          <div className="relative">
            <select
              value={cursor.getMonth()}
              onChange={(e) => pickMonth(Number(e.target.value))}
              className="appearance-none bg-transparent pr-4 pl-1 py-1 text-[12px] font-semibold text-stone-800 hover:text-brand cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30 rounded"
              aria-label="Seleccionar mes"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i}>
                  {name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-stone-400">
              <IconChev />
            </span>
          </div>

          {/* Dropdown de año */}
          <div className="relative">
            <select
              value={cursor.getFullYear()}
              onChange={(e) => pickYear(Number(e.target.value))}
              className="appearance-none bg-transparent pr-4 pl-1 py-1 text-[12px] text-stone-500 hover:text-brand cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30 rounded tabular-nums"
              aria-label="Seleccionar año"
            >
              {yearRange.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-stone-400">
              <IconChev />
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="grid h-7 w-7 place-items-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition shrink-0"
          aria-label="Mes siguiente"
        >
          <IconArrow dir="right" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-center text-[9px] font-semibold text-stone-400 mb-0.5 uppercase">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="py-0.5">{h}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px">
        {grid.map(({ date, currentMonth }) => {
          const isToday = sameDay(date, today);
          const isSelected = sameDay(date, selectedDate);
          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onSelectDate(date)}
              className={`h-7 rounded text-center text-[11px] transition tabular-nums ${
                isSelected
                  ? "bg-brand text-white font-bold shadow-sm"
                  : isToday
                    ? "bg-stone-900 text-white font-semibold"
                    : currentMonth
                      ? "text-stone-700 hover:bg-stone-100"
                      : "text-stone-300 hover:bg-stone-50"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
