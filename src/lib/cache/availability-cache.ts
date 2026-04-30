import { revalidateTag } from "next/cache";

/**
 * Cache layer para queries de disponibilidad — el endpoint público
 * `/api/book/availability` es el más caliente del sistema y antes
 * gatillaba 4 queries Prisma por cada request (schedules + working
 * hours + appointments + blocks). 50 usuarios viendo "horarios
 * disponibles" = ~200 QPS sobre data que NO cambia hasta que alguien
 * reserva.
 *
 * Estrategia:
 * - TTL 30s en `unstable_cache` → reduce 200 QPS → ~7 QPS (1 query
 *   por sucursal-fecha cada 30 segundos).
 * - Tags por sucursal y por barbero → cuando se crea/cancela/mueve
 *   una cita, llamamos `invalidateAvailability({barberId, branchId})`
 *   y los usuarios ven el cambio inmediatamente (no esperan 30s).
 *
 * El POST de booking (`/api/book` y `/api/admin/appointments`) NO usa
 * este caché — siempre lee fresh dentro de la transacción con advisory
 * lock, así que no hay riesgo de overbooking aunque el caché esté stale.
 */

/** Tag por sucursal — cubre `getBarbersWithAvailability` y `getAvailabilityHeatmap`. */
export function availabilityBranchTag(branchId: string): string {
  return `availability:branch:${branchId}`;
}

/** Tag por barbero — cubre `getAvailableSlots` (slots de un barbero puntual). */
export function availabilityBarberTag(barberId: string): string {
  return `availability:barber:${barberId}`;
}

/**
 * Invalidar el caché de disponibilidad. Pasá los IDs que correspondan:
 *  - `barberId` siempre que cambie algo de un barbero (cita nueva,
 *    cancelada, reprogramada, bloqueo, schedule).
 *  - `branchId` cuando el cambio afecta a la sucursal entera (working
 *    hours, o al crear cita — porque `getBarbersWithAvailability` itera
 *    todos los barberos de la sucursal).
 *
 * Llamar revalidateTag es barato (no espera nada): solo marca las
 * entradas del cache como stale para el próximo read.
 */
export function invalidateAvailability(opts: {
  barberId?: string;
  branchId?: string;
}): void {
  // En Next 16 `revalidateTag(tag, profile)` requiere un perfil. "max" =
  // expiración inmediata (la siguiente lectura va fresh, no espera TTL).
  if (opts.barberId) revalidateTag(availabilityBarberTag(opts.barberId), "max");
  if (opts.branchId) revalidateTag(availabilityBranchTag(opts.branchId), "max");
}
