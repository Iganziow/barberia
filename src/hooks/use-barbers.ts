"use client";

import { useEffect, useRef, useState } from "react";
import type { BarberOption } from "@/types/agenda";

export function useBarbers(branchId?: string) {
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const params = branchId ? `?branchId=${branchId}` : "";
    fetch(`/api/admin/barbers${params}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.barbers) setBarbers(data.barbers);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoading(false);
      });

    return () => controller.abort();
  }, [branchId]);

  return { barbers, loading };
}
