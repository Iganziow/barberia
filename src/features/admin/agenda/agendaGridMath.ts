import type { VisibleRange } from "@/types/agenda";
import { hhmmToMinutes } from "./barberScheduleBlocks";

/**
 * Resolución de la grilla: 15 minutos por fila.
 */
export const SLOT_MINUTES = 15;

/**
 * Cuántas filas totales necesita la grilla para un rango visible.
 */
export function gridRowCount(range: VisibleRange): number {
  const fromM = hhmmToMinutes(range.from);
  const toM = hhmmToMinutes(range.to);
  return Math.max(0, Math.floor((toM - fromM) / SLOT_MINUTES));
}

/**
 * Calcula la posición grid-row (1-indexed, inclusive/exclusive) para un evento.
 * Si el evento queda completamente fuera del rango visible, retorna null.
 * Si el evento es parcial, se recorta al rango visible.
 */
export function eventGridRows(
  startISO: string,
  endISO: string,
  rangeStartDate: Date, // día del calendario a las 00:00 local
  range: VisibleRange
): { startRow: number; endRow: number } | null {
  const start = new Date(startISO);
  const end = new Date(endISO);

  // Minutos desde las 00:00 del día del calendario
  const startMin =
    (start.getTime() - rangeStartDate.getTime()) / 60000;
  const endMin = (end.getTime() - rangeStartDate.getTime()) / 60000;

  const vFrom = hhmmToMinutes(range.from);
  const vTo = hhmmToMinutes(range.to);

  const clampedStart = Math.max(startMin, vFrom);
  const clampedEnd = Math.min(endMin, vTo);

  if (clampedEnd <= clampedStart) return null;

  // grid-row es 1-indexed; row 1 = minute vFrom
  const startRow = Math.floor((clampedStart - vFrom) / SLOT_MINUTES) + 1;
  const endRow = Math.ceil((clampedEnd - vFrom) / SLOT_MINUTES) + 1;

  return { startRow, endRow };
}

/**
 * Las etiquetas de hora que aparecen en la columna izquierda (cada 15min).
 * Marca las que son "on the hour" para styling.
 */
export function timeLabels(range: VisibleRange): Array<{
  label: string;
  row: number;
  onTheHour: boolean;
}> {
  const vFrom = hhmmToMinutes(range.from);
  const vTo = hhmmToMinutes(range.to);
  const result: Array<{ label: string; row: number; onTheHour: boolean }> = [];
  let row = 1;
  for (let m = vFrom; m < vTo; m += SLOT_MINUTES) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    result.push({
      label: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
      row,
      onTheHour: min === 0,
    });
    row++;
  }
  return result;
}
