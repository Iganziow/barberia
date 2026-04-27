/**
 * Next.js instrumentation hook — corre UNA vez por proceso, antes de
 * cualquier request. Lo usamos para forzar la timezone del servidor a
 * America/Santiago.
 *
 * ¿Por qué?
 * Todo el algoritmo de slots (`new Date("2026-04-27T00:00:00")`,
 * `setHours()`, `getDay()`) usa la TZ local del servidor. Si el server
 * corre en UTC (default de Vercel/Railway), una reserva "9:00 AM" se
 * guarda como "9:00 UTC" = "5:00 AM Chile". Las horas se mueven 4 hs.
 *
 * En lugar de pedirle al equipo que recuerde setear la env var en cada
 * deploy, la fijamos acá. Si alguna vez vendemos a otro mercado,
 * cambiar a leer de organization.timezone.
 *
 * Importante: setear `process.env.TZ` solo afecta al proceso actual y
 * funciona si se hace ANTES de la primera llamada a Date. instrumentation
 * cumple esa garantía.
 */
export async function register() {
  if (!process.env.TZ) {
    process.env.TZ = "America/Santiago";
  }
}
