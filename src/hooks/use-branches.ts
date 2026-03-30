"use client";

import { useEffect, useState } from "react";
import type { BranchOption } from "@/types/agenda";

export function useBranches() {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/branches")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.branches) setBranches(data.branches);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { branches, loading };
}
