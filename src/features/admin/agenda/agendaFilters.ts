import type {
  AgendaEvent,
  AppointmentStatusCode,
  StatusPreset,
} from "@/types/agenda";

/**
 * Statuses visibles en el preset "Reservas activas" (default).
 * DONE se incluye acá: una cita ya pagada/finalizada sigue siendo info
 * útil del día (cuántos cortes hizo el barbero, qué slots están
 * ocupados). Antes DONE estaba en HISTORY y desaparecía de la agenda
 * tras procesar pago — el usuario reportaba "se desaparecen las
 * reservas" porque cambiaban de status. Bug audit 2026-04-30 #7.
 *
 * CANCELED y NO_SHOW siguen en HISTORY: son outcomes negativos que NO
 * aportan al panel diario y los queremos ocultos por default
 * (admin que canceló a propósito no quiere verlas todo el día).
 */
export const STATUS_ACTIVE: AppointmentStatusCode[] = [
  "RESERVED",
  "CONFIRMED",
  "ARRIVED",
  "IN_PROGRESS",
  "DONE",
];

export const STATUS_HISTORY: AppointmentStatusCode[] = [
  "CANCELED",
  "NO_SHOW",
];

export const STATUS_ALL: AppointmentStatusCode[] = [
  ...STATUS_ACTIVE,
  ...STATUS_HISTORY,
];

/**
 * Convierte un preset a su set de statuses.
 */
export function statusesForPreset(preset: StatusPreset): AppointmentStatusCode[] {
  switch (preset) {
    case "ACTIVE":
      return STATUS_ACTIVE;
    case "HISTORY":
      return STATUS_HISTORY;
    case "ALL":
      return STATUS_ALL;
    case "CUSTOM":
      return [];
  }
}

/**
 * Filtra eventos según filtros. Los eventos UNAVAILABLE siempre pasan
 * (son solo visuales). Los BLOCK pasan salvo que se quiera ocultarlos
 * explícitamente (showBlocks=false, p.ej. al imprimir solo reservas).
 */
export function filterAgendaEvents(
  events: AgendaEvent[],
  filters: {
    barberIds?: string[]; // [] o undefined = todos
    statuses: AppointmentStatusCode[]; // statuses permitidos para APPOINTMENT
    showBlocks?: boolean; // default true
  }
): AgendaEvent[] {
  const { barberIds, statuses, showBlocks = true } = filters;
  const barberSet = barberIds && barberIds.length > 0 ? new Set(barberIds) : null;
  const statusSet = new Set(statuses);

  return events.filter((e) => {
    if (e.kind === "UNAVAILABLE") {
      return !barberSet || barberSet.has(e.barberId);
    }
    if (barberSet && !barberSet.has(e.barberId)) return false;
    if (e.kind === "BLOCK") return showBlocks;
    // APPOINTMENT
    return statusSet.has(e.status as AppointmentStatusCode);
  });
}
