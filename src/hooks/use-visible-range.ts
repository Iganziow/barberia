"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { VisibleRange } from "@/types/agenda";
import {
  DEFAULT_RANGE,
  STORAGE_KEY,
  isValidRange,
  readStoredRange,
  writeStoredRange,
} from "@/features/admin/agenda/agendaVisibleRange";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

// Cache para evitar referencias nuevas cada render (useSyncExternalStore lo exige).
let cachedRaw: string | null = null;
let cachedValue: VisibleRange = DEFAULT_RANGE;

function getSnapshot(): VisibleRange {
  if (typeof window === "undefined") return DEFAULT_RANGE;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  cachedValue = readStoredRange();
  return cachedValue;
}

function getServerSnapshot(): VisibleRange {
  return DEFAULT_RANGE;
}

export function useVisibleRange() {
  const range = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setRange = useCallback((next: VisibleRange) => {
    if (!isValidRange(next)) return;
    writeStoredRange(next);
    // Invalida el cache y dispara un re-render manualmente emulando el evento "storage".
    cachedRaw = null;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    }
  }, []);

  return { range, setRange };
}
