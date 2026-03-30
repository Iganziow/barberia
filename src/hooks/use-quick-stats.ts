"use client";

import { useEffect, useState } from "react";

type QuickStats = {
  appointmentCount: number;
  nextAppointmentTime: string | null;
  todayRevenue: number;
};

export function useQuickStats() {
  const [stats, setStats] = useState<QuickStats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, []);

  return stats;
}
