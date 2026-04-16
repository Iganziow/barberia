"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  SLOT_MINUTES_OPTIONS,
  type SlotMinutes,
} from "@/features/admin/agenda/agendaGridMath";

const STORAGE_KEY = "agenda_slot_minutes_v1";
const DEFAULT: SlotMinutes = 15;

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function readSnapshot(): SlotMinutes {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const n = Number(raw);
    if ((SLOT_MINUTES_OPTIONS as readonly number[]).includes(n)) {
      return n as SlotMinutes;
    }
  } catch {
    // ignore
  }
  return DEFAULT;
}

function serverSnapshot(): SlotMinutes {
  return DEFAULT;
}

export function useSlotMinutes() {
  const slotMinutes = useSyncExternalStore(subscribe, readSnapshot, serverSnapshot);

  const setSlotMinutes = useCallback((value: SlotMinutes) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    } catch {
      // ignore
    }
  }, []);

  return { slotMinutes, setSlotMinutes };
}
