import type { AgendaEvent, BarberScheduleEntry, VisibleRange } from "@/types/agenda";

/**
 * Convierte "HH:mm" a minutos desde medianoche.
 */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Devuelve un ISO string local (sin TZ shift) para una fecha+hora dadas.
 * `date` es un objeto Date ya apuntando al día deseado (a medianoche local).
 * `minutes` son minutos desde medianoche.
 */
function toISOAtMinute(date: Date, minutes: number): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d.toISOString();
}

/**
 * Dado un rango [fromDay, toDay] (inclusivo), los horarios de los barberos y un
 * rango visible del calendario, calcula los bloques "Profesional no disponible".
 *
 * Regla:
 * - Si para ese barbero+día no hay BarberSchedule, se asume TODO el rango visible no disponible.
 * - Si `isWorking === false`, todo el rango visible de ese día es no disponible.
 * - Si trabaja, se emiten hasta 2 bloques: uno antes del startTime y otro después del endTime,
 *   siempre que queden dentro del rango visible.
 *
 * Cada bloque se emite como un AgendaEvent con `kind: "UNAVAILABLE"` para que las vistas
 * puedan renderizarlos sin lógica adicional.
 */
export function computeUnavailableBlocks(params: {
  schedules: BarberScheduleEntry[];
  barberIds: string[];
  fromDay: Date; // día local (00:00)
  toDay: Date; // día local (00:00), inclusivo
  visibleRange: VisibleRange;
}): AgendaEvent[] {
  const { schedules, barberIds, fromDay, toDay, visibleRange } = params;

  const visibleFrom = hhmmToMinutes(visibleRange.from);
  const visibleTo = hhmmToMinutes(visibleRange.to);
  if (visibleTo <= visibleFrom) return [];

  const scheduleByKey = new Map<string, BarberScheduleEntry>();
  for (const s of schedules) {
    scheduleByKey.set(`${s.barberId}:${s.dayOfWeek}`, s);
  }

  const blocks: AgendaEvent[] = [];

  const cursor = new Date(fromDay);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(toDay);
  end.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= end.getTime()) {
    const day = new Date(cursor);
    const dow = day.getDay();

    for (const barberId of barberIds) {
      const s = scheduleByKey.get(`${barberId}:${dow}`);

      if (!s || !s.isWorking) {
        blocks.push({
          id: `unavailable:${barberId}:${day.toDateString()}:full`,
          title: "Profesional no disponible",
          start: toISOAtMinute(day, visibleFrom),
          end: toISOAtMinute(day, visibleTo),
          kind: "UNAVAILABLE",
          barberId,
          status: "ACTIVE",
        });
        continue;
      }

      const startMin = hhmmToMinutes(s.startTime);
      const endMin = hhmmToMinutes(s.endTime);

      if (startMin > visibleFrom) {
        const to = Math.min(startMin, visibleTo);
        if (to > visibleFrom) {
          blocks.push({
            id: `unavailable:${barberId}:${day.toDateString()}:before`,
            title: "Profesional no disponible",
            start: toISOAtMinute(day, visibleFrom),
            end: toISOAtMinute(day, to),
            kind: "UNAVAILABLE",
            barberId,
            status: "ACTIVE",
          });
        }
      }

      if (endMin < visibleTo) {
        const from = Math.max(endMin, visibleFrom);
        if (from < visibleTo) {
          blocks.push({
            id: `unavailable:${barberId}:${day.toDateString()}:after`,
            title: "Profesional no disponible",
            start: toISOAtMinute(day, from),
            end: toISOAtMinute(day, visibleTo),
            kind: "UNAVAILABLE",
            barberId,
            status: "ACTIVE",
          });
        }
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return blocks;
}
