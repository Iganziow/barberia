import type { AgendaEvent } from "@/types/agenda";

export type OverlapResult = {
  ok: boolean;
  conflicts: AgendaEvent[];
};

function toMs(iso: string) {
  return new Date(iso).getTime();
}

// Statuses que bloquean la creación de una reserva (no permiten overlap).
const BLOCKING_STATUSES = new Set<AgendaEvent["status"]>([
  "ACTIVE", // BLOCK events
  "RESERVED",
  "CONFIRMED",
  "ARRIVED",
  "IN_PROGRESS",
  "DONE",
]);

// Intervalos se solapan si startA < endB && startB < endA
export function hasOverlap(
  existing: AgendaEvent[],
  next: { startISO: string; endISO: string; barberId: string },
  options?: {
    ignoreEventId?: string;
    considerStatuses?: Array<AgendaEvent["status"]>;
  }
): OverlapResult {
  const start = toMs(next.startISO);
  const end = toMs(next.endISO);
  const considerSet = options?.considerStatuses
    ? new Set(options.considerStatuses)
    : BLOCKING_STATUSES;

  const conflicts = existing.filter((e) => {
    if (options?.ignoreEventId && e.id === options.ignoreEventId) return false;
    // UNAVAILABLE son solo visuales; no bloquean overlaps.
    if (e.kind === "UNAVAILABLE") return false;
    if (e.barberId !== next.barberId) return false;
    if (!considerSet.has(e.status)) return false;

    const es = toMs(e.start);
    const ee = toMs(e.end);

    return start < ee && es < end;
  });

  return { ok: conflicts.length === 0, conflicts };
}
