"use client";

import { useReducer, useCallback } from "react";

/**
 * Estado centralizado de todos los modales del agenda.
 * Discriminated union: solo un modal abierto a la vez.
 * Al cambiar de modal se limpia automáticamente el state anterior,
 * evitando bugs donde quedaban IDs/preselections viejos.
 */
export type ModalState =
  | { type: "none" }
  | {
      type: "new";
      startISO: string | null;
      endISO?: string | null;
      barberId?: string;
      serviceId?: string;
    }
  | { type: "block"; startISO: string | null; barberId?: string }
  | { type: "detail"; appointmentId: string }
  | { type: "quickSearch" };

export type SlotMenuState =
  | { open: false }
  | {
      open: true;
      x: number;
      y: number;
      isoStart: string;
      barberId: string;
    };

type ModalAction =
  | { type: "close" }
  | {
      type: "openNew";
      startISO: string | null;
      endISO?: string | null;
      barberId?: string;
      serviceId?: string;
    }
  | { type: "openBlock"; startISO: string | null; barberId?: string }
  | { type: "openDetail"; appointmentId: string }
  | { type: "openQuickSearch" };

function modalReducer(_: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case "close":
      return { type: "none" };
    case "openNew":
      return {
        type: "new",
        startISO: action.startISO,
        endISO: action.endISO,
        barberId: action.barberId,
        serviceId: action.serviceId,
      };
    case "openBlock":
      return {
        type: "block",
        startISO: action.startISO,
        barberId: action.barberId,
      };
    case "openDetail":
      return { type: "detail", appointmentId: action.appointmentId };
    case "openQuickSearch":
      return { type: "quickSearch" };
  }
}

type SlotMenuAction =
  | { type: "close" }
  | {
      type: "open";
      x: number;
      y: number;
      isoStart: string;
      barberId?: string;
    };

function slotMenuReducer(_: SlotMenuState, action: SlotMenuAction): SlotMenuState {
  if (action.type === "close") return { open: false };
  return {
    open: true,
    x: action.x,
    y: action.y,
    isoStart: action.isoStart,
    barberId: action.barberId ?? "",
  };
}

export function useAgendaModals() {
  const [modal, dispatch] = useReducer(modalReducer, { type: "none" });
  const [slotMenu, dispatchSlot] = useReducer(slotMenuReducer, { open: false });

  const close = useCallback(() => dispatch({ type: "close" }), []);

  const openNew = useCallback(
    (opts: {
      startISO: string | null;
      endISO?: string | null;
      barberId?: string;
      serviceId?: string;
    }) => dispatch({ type: "openNew", ...opts }),
    []
  );

  const openBlock = useCallback(
    (opts: { startISO: string | null; barberId?: string }) =>
      dispatch({ type: "openBlock", ...opts }),
    []
  );

  const openDetail = useCallback(
    (appointmentId: string) =>
      dispatch({ type: "openDetail", appointmentId }),
    []
  );

  const openQuickSearch = useCallback(
    () => dispatch({ type: "openQuickSearch" }),
    []
  );

  const openSlotMenu = useCallback(
    (opts: { x: number; y: number; isoStart: string; barberId?: string }) =>
      dispatchSlot({ type: "open", ...opts }),
    []
  );

  const closeSlotMenu = useCallback(() => dispatchSlot({ type: "close" }), []);

  return {
    modal,
    slotMenu,
    close,
    openNew,
    openBlock,
    openDetail,
    openQuickSearch,
    openSlotMenu,
    closeSlotMenu,
  };
}
