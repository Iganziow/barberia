import type { VisibleRange } from "@/types/agenda";

export const DEFAULT_RANGE: VisibleRange = { from: "09:00", to: "21:00" };
export const STORAGE_KEY = "agenda_visible_range_v1";

// Límites razonables para una barbería (ninguna abre antes de las 6am ni cierra después de las 23:30)
const MIN_FROM_HOUR = 6;
const MAX_TO_HOUR = 23;

const HHMM = /^(\d{2}):(\d{2})$/;

/**
 * Valida un string "HH:mm" asegurándose además de que sea un paso de 30 minutos.
 */
export function isValidHHmm(value: string): boolean {
  const m = value.match(HHMM);
  if (!m) return false;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23) return false;
  if (min !== 0 && min !== 30) return false;
  return true;
}

export function isValidRange(range: VisibleRange): boolean {
  if (!isValidHHmm(range.from) || !isValidHHmm(range.to)) return false;
  const [fh, fm] = range.from.split(":").map(Number);
  const [th, tm] = range.to.split(":").map(Number);
  const fromMin = fh * 60 + fm;
  const toMin = th * 60 + tm;
  // Requiere al menos 1 hora de diferencia y dentro de rango razonable
  if (fromMin >= toMin - 30) return false;
  if (fh < MIN_FROM_HOUR) return false;
  if (th > MAX_TO_HOUR || (th === MAX_TO_HOUR && tm > 30)) return false;
  return true;
}

/**
 * Genera valores HH:mm en pasos de 30min para el selector de "desde".
 * Solo horas razonables (06:00-20:00).
 */
export function fromSteps(): string[] {
  const steps: string[] = [];
  for (let h = MIN_FROM_HOUR; h <= 20; h++) {
    for (const m of [0, 30]) {
      steps.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return steps;
}

/**
 * Genera valores HH:mm en pasos de 30min para el selector de "hasta".
 * Solo horas razonables (07:00-23:30).
 */
export function toSteps(): string[] {
  const steps: string[] = [];
  for (let h = 7; h <= MAX_TO_HOUR; h++) {
    for (const m of [0, 30]) {
      steps.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return steps;
}

/**
 * @deprecated Usa fromSteps() o toSteps() con rangos razonables.
 */
export function halfHourSteps(): string[] {
  return fromSteps();
}

/**
 * Lee el rango visible desde localStorage, con fallback al default si no existe o es inválido.
 * Safe para SSR (devuelve default si no hay window).
 */
export function readStoredRange(): VisibleRange {
  if (typeof window === "undefined") return DEFAULT_RANGE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RANGE;
    const parsed = JSON.parse(raw) as VisibleRange;
    if (isValidRange(parsed)) return parsed;
  } catch {
    // ignore parse errors
  }
  return DEFAULT_RANGE;
}

export function writeStoredRange(range: VisibleRange): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(range));
  } catch {
    // ignore storage errors
  }
}
