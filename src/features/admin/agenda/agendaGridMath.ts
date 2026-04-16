import type { VisibleRange } from "@/types/agenda";
import { hhmmToMinutes } from "./barberScheduleBlocks";

/**
 * Resolución de la grilla por defecto: 15 minutos por fila.
 * (Mantenido como constante para compatibilidad; usar slotMinutes param para overrides.)
 */
export const SLOT_MINUTES = 15;

/** Opciones válidas de granularidad (minutos por fila). */
export const SLOT_MINUTES_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const;
export type SlotMinutes = (typeof SLOT_MINUTES_OPTIONS)[number];

/**
 * Altura en px por fila según la granularidad elegida.
 * Mayor granularidad = filas más compactas, menor = filas más espaciadas
 * para que toda la información de ese intervalo se lea cómodamente.
 */
export function rowHeightFor(slotMinutes: number): number {
  switch (slotMinutes) {
    case 5:
      return 14;
    case 10:
      return 18;
    case 15:
      return 22;
    case 20:
      return 26;
    case 30:
      return 36;
    case 45:
      return 52;
    case 60:
      return 64;
    default:
      return 22;
  }
}

/**
 * Cuántas filas totales necesita la grilla para un rango visible.
 */
export function gridRowCount(
  range: VisibleRange,
  slotMinutes: number = SLOT_MINUTES
): number {
  const fromM = hhmmToMinutes(range.from);
  const toM = hhmmToMinutes(range.to);
  return Math.max(0, Math.floor((toM - fromM) / slotMinutes));
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
  range: VisibleRange,
  slotMinutes: number = SLOT_MINUTES
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
  const startRow = Math.floor((clampedStart - vFrom) / slotMinutes) + 1;
  const endRow = Math.ceil((clampedEnd - vFrom) / slotMinutes) + 1;

  return { startRow, endRow };
}

/**
 * Las etiquetas de hora que aparecen en la columna izquierda.
 * Marca "onTheHour" cuando la hora es en punto, "onHalfHour" cuando es :30.
 */
export function timeLabels(
  range: VisibleRange,
  slotMinutes: number = SLOT_MINUTES
): Array<{
  label: string;
  row: number;
  onTheHour: boolean;
  onHalfHour: boolean;
  minutes: number; // minutos desde medianoche
}> {
  const vFrom = hhmmToMinutes(range.from);
  const vTo = hhmmToMinutes(range.to);
  const result: Array<{
    label: string;
    row: number;
    onTheHour: boolean;
    onHalfHour: boolean;
    minutes: number;
  }> = [];
  let row = 1;
  for (let m = vFrom; m < vTo; m += slotMinutes) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    result.push({
      label: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
      row,
      onTheHour: min === 0,
      onHalfHour: min === 30,
      minutes: m,
    });
    row++;
  }
  return result;
}
