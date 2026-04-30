"use client";

import { useSyncExternalStore } from "react";

/**
 * Devuelve true sólo después de montar en el cliente.
 *
 * Útil para componentes que dependen de window/localStorage y necesitan
 * renderizar un placeholder estable durante SSR + primer paint para
 * evitar hydration mismatch.
 *
 * Implementado con useSyncExternalStore para cumplir react-hooks/set-state-in-effect
 * (React 19 strict). Patrón equivalente a `useEffect(() => setMounted(true), [])`
 * pero sin setState dentro de un effect.
 */
const noop = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function useIsClient(): boolean {
  return useSyncExternalStore(noop, onClient, onServer);
}
