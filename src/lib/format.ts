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
 * Format a time string from ISO to HH:MM (es-CL locale).
 */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}
