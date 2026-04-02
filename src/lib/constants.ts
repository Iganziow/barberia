/**
 * Shared appointment status configuration.
 * Used across barber portal, admin agenda, and client detail pages.
 */
export const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  text: string;
  dot: string;
}> = {
  RESERVED:    { label: "Pendiente",   color: "#3B82F6", bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500" },
  CONFIRMED:   { label: "Confirmado",  color: "#0EA5E9", bg: "bg-sky-50",     text: "text-sky-700",     dot: "bg-sky-500" },
  ARRIVED:     { label: "Llegó",       color: "#F59E0B", bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  IN_PROGRESS: { label: "En curso",    color: "#8B5CF6", bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-500" },
  DONE:        { label: "Completado",  color: "#10B981", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  CANCELED:    { label: "Cancelado",   color: "#9CA3AF", bg: "bg-stone-100",  text: "text-stone-500",   dot: "bg-stone-400" },
  NO_SHOW:     { label: "No asistió",  color: "#EF4444", bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-500" },
};
