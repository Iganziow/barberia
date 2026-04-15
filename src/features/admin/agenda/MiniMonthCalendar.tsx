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

/**
 * Mini calendario mensual. Lunes-primero.
 * Marca hoy con un círculo relleno y la fecha seleccionada con un ring.
 */
export default function MiniMonthCalendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}) {
  const [cursor, setCursor] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const grid = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    // getDay: 0=Sunday, 1=Monday ...; en layout L-D queremos índice 0 = lunes
    const firstDow = (firstOfMonth.getDay() + 6) % 7;

    const days: Array<{ date: Date; currentMonth: boolean }> = [];

    // Días del mes anterior
    for (let i = firstDow - 1; i >= 0; i--) {
      const d = new Date(firstOfMonth);
      d.setDate(d.getDate() - (i + 1));
      days.push({ date: d, currentMonth: false });
    }

    // Días del mes actual
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

    // Completar hasta múltiplo de 7 (con inicio del mes siguiente)
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1].date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      days.push({ date: d, currentMonth: false });
    }

    return days;
  }, [cursor]);

  function prevMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }

  return (
    <div className="text-xs">
      <div className="flex items-center justify-between mb-1.5">
        <button
          type="button"
          onClick={prevMonth}
          className="grid h-6 w-6 place-items-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <div className="text-[11px] font-semibold text-stone-700">
          {MONTH_NAMES[cursor.getMonth()]}{" "}
          <span className="text-stone-400 font-normal">{cursor.getFullYear()}</span>
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="grid h-6 w-6 place-items-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[9px] font-semibold text-stone-400 mb-0.5">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="py-0.5">{h}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {grid.map(({ date, currentMonth }) => {
          const isToday = sameDay(date, today);
          const isSelected = sameDay(date, selectedDate);
          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onSelectDate(date)}
              className={`h-6 rounded text-center text-[10.5px] transition tabular-nums ${
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
