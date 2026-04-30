"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Hook de tema con persistencia en localStorage.
 *
 * Modos:
 *  - "light"  → forzar tema claro
 *  - "dark"   → forzar tema oscuro
 *  - "system" → seguir prefers-color-scheme del SO
 *
 * El valor se persiste en localStorage["mb_theme"] y se aplica como
 * `data-theme="dark"` o `data-theme="light"` en <html>. Un script inline
 * en <html> (ver layout.tsx) corre ANTES del paint para evitar flash.
 *
 * Uso:
 *   const { theme, setTheme, resolved } = useTheme();
 *   <button onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}>...</button>
 */

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "mb_theme";
const CHANGE_EVENT = "mb-theme-changed";

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") return getSystemTheme();
  return mode;
}

/** Aplica el tema resolved al <html> como data-theme. */
function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(mode);
  document.documentElement.dataset.theme = resolved;
  // color-scheme nativo: navegador ajusta scrollbars, form controls, etc.
  document.documentElement.style.colorScheme = resolved;
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  window.addEventListener(CHANGE_EVENT, cb);
  // Si el modo es "system", reaccionar a cambios del SO
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(CHANGE_EVENT, cb);
    mql.removeEventListener("change", cb);
  };
}

function getSnapshot(): ThemeMode {
  return getStoredTheme();
}

function getServerSnapshot(): ThemeMode {
  return "system";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: ThemeMode) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage bloqueado / lleno: aplicamos en sesión sin persistir.
    }
    applyTheme(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const resolved = resolveTheme(theme);

  return { theme, setTheme, resolved } as const;
}
