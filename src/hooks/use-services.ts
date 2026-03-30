"use client";

import { useEffect, useState } from "react";
import type { ServiceOption } from "@/types/agenda";

export function useServices() {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/services")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.services) setServices(data.services);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { services, loading };
}
