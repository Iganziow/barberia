"use client";

import { useCallback, useEffect, useState } from "react";
import type { BarberScheduleEntry } from "@/types/agenda";

export function useBarberSchedules(branchId: string | undefined) {
  const [schedules, setSchedules] = useState<BarberScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSchedules = useCallback(async () => {
    if (!branchId) {
      setSchedules([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/barber-schedules?branchId=${branchId}`);
      if (!res.ok) {
        setSchedules([]);
        return;
      }
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  return { schedules, loading, refetch: fetchSchedules };
}
