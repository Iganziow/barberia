/**
 * Format a number as Chilean Pesos (CLP).
 * Example: 12000 → "$12.000"
 */
export function formatCLP(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Format a time string from ISO to HH:MM (24h, sin "a. m."/"p. m.").
 *
 * `hour12: false` es obligatorio: sin él, Chrome/Node devuelven "09:30 p. m."
 * para "es-CL" — formato inusual en Chile (estándar 24h). Esto causaba
 * "10:30 a. m. hrs" en la confirmación pública y mensajes de WhatsApp poco
 * pulidos. Auditoría usabilidad 2026-04-30 UX-1/UX-2/UX-4.
 */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
