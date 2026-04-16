/**
 * Helpers de fecha que preservan la fecha LOCAL del usuario.
 *
 * Problema que resuelven:
 * `new Date().toISOString().split("T")[0]` devuelve la fecha en UTC.
 * En Chile (UTC-4), a las 22:00 local del 14 de abril, UTC ya es 15 de abril → bug.
 *
 * Para serializar un instante específico (como una cita) sí se debe usar toISOString()
 * porque queremos preservar el momento exacto. Pero para serializar una "fecha calendario"
 * (sin hora concreta) debemos usar la fecha LOCAL del usuario.
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * "2026-04-14" — fecha YYYY-MM-DD en la timezone local del usuario.
 */
export function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Fecha de hoy en YYYY-MM-DD local. Robusto en zonas horarias negativas cerca de medianoche.
 */
export function todayLocalDateString(): string {
  return toLocalDateString(new Date());
}

/**
 * "2026-04-14T09:30:00" — fecha+hora local sin sufijo Z (sin UTC shift).
 * Útil para pasar a componentes de calendario (ej: FullCalendar initialDate)
 * que interpretan strings sin TZ como "hora local de la app".
 */
export function toLocalDateTimeString(d: Date): string {
  return `${toLocalDateString(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/**
 * Construye un Date local desde componentes separados. Útil para parsear inputs del usuario.
 */
export function buildLocalDateTime(
  dateStr: string, // YYYY-MM-DD
  hour: number,
  minute: number
): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hour, minute, 0, 0);
}
