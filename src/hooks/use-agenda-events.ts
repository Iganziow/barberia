"use client";

import { useCallback, useEffect, useState } from "react";
import type { AgendaEvent } from "@/types/agenda";

type Filters = {
  branchId?: string;
  barberId?: string;
  from?: string;
  to?: string;
};

function statusToAgenda(status: string): AgendaEvent["status"] {
  if (status === "CANCELED") return "CANCELED";
  if (status === "DONE") return "DONE";
  return "ACTIVE";
}

export function useAgendaEvents(filters: Filters) {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (filters.branchId) params.set("branchId", filters.branchId);
    if (filters.barberId) params.set("barberId", filters.barberId);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    const qs = params.toString();

    try {
      const [aptRes, blockRes] = await Promise.all([
        fetch(`/api/admin/appointments${qs ? `?${qs}` : ""}`),
        fetch(`/api/admin/block-times${qs ? `?${qs}` : ""}`),
      ]);

      const aptData = aptRes.ok ? await aptRes.json() : { appointments: [] };
      const blockData = blockRes.ok
        ? await blockRes.json()
        : { blockTimes: [] };

      const aptEvents: AgendaEvent[] = (aptData.appointments || []).map(
        (a: {
          id: string;
          clientName: string;
          serviceName: string;
          start: string;
          end: string;
          barberId: string;
          status: string;
        }) => ({
          id: a.id,
          title: `${a.clientName}\n${a.serviceName}`,
          start: a.start,
          end: a.end,
          kind: "APPOINTMENT" as const,
          barberId: a.barberId,
          status: statusToAgenda(a.status),
        })
      );

      const blockEvents: AgendaEvent[] = (blockData.blockTimes || []).map(
        (b: {
          id: string;
          reason: string;
          start: string;
          end: string;
          barberId: string;
        }) => ({
          id: b.id,
          title: b.reason || "Bloqueado",
          start: b.start,
          end: b.end,
          kind: "BLOCK" as const,
          barberId: b.barberId,
          status: "ACTIVE" as const,
        })
      );

      setEvents([...aptEvents, ...blockEvents]);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [filters.branchId, filters.barberId, filters.from, filters.to]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, refetch: fetchEvents };
}
