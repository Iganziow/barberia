import type { AgendaEvent } from "./AgendaCalendar";

export type OverlapResult = {
  ok: boolean;
  conflicts: AgendaEvent[];
};

function toMs(iso: string) {
  return new Date(iso).getTime();
}

// Intervalos se solapan si startA < endB && startB < endA
export function hasOverlap(
  existing: AgendaEvent[],
  next: { startISO: string; endISO: string; barberId: string },
  options?: {
    ignoreEventId?: string;
    // si quieres permitir que un cliente tenga 2 reservas simultáneas, esto lo ajustamos después
    considerStatuses?: Array<AgendaEvent["status"]>;
  }
): OverlapResult {
  const start = toMs(next.startISO);
  const end = toMs(next.endISO);
  const consider = options?.considerStatuses ?? ["ACTIVE"];

  const conflicts = existing.filter((e) => {
    if (options?.ignoreEventId && e.id === options.ignoreEventId) return false;
    if (e.barberId !== next.barberId) return false;
    if (!consider.includes(e.status)) return false;

    const es = toMs(e.start);
    const ee = toMs(e.end);

    return start < ee && es < end;
  });

  return { ok: conflicts.length === 0, conflicts };
}
