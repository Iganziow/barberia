import { describe, it, expect } from "vitest";
import {
  filterAgendaEvents,
  statusesForPreset,
  STATUS_ACTIVE,
  STATUS_HISTORY,
  STATUS_ALL,
} from "@/features/admin/agenda/agendaFilters";
import type { AgendaEvent } from "@/types/agenda";

function evt(partial: Partial<AgendaEvent>): AgendaEvent {
  return {
    id: "e",
    title: "t",
    start: "2026-04-14T09:00:00Z",
    end: "2026-04-14T10:00:00Z",
    kind: "APPOINTMENT",
    barberId: "b1",
    status: "RESERVED",
    ...partial,
  };
}

describe("statusesForPreset", () => {
  it("maps ACTIVE preset", () => {
    expect(statusesForPreset("ACTIVE")).toEqual(STATUS_ACTIVE);
  });
  it("maps HISTORY preset", () => {
    expect(statusesForPreset("HISTORY")).toEqual(STATUS_HISTORY);
  });
  it("maps ALL preset", () => {
    expect(statusesForPreset("ALL")).toEqual(STATUS_ALL);
  });
  it("maps CUSTOM preset to empty (user provides their own)", () => {
    expect(statusesForPreset("CUSTOM")).toEqual([]);
  });
});

describe("filterAgendaEvents", () => {
  it("filters by barberIds when non-empty", () => {
    const events = [
      evt({ id: "1", barberId: "b1" }),
      evt({ id: "2", barberId: "b2" }),
    ];
    const result = filterAgendaEvents(events, {
      barberIds: ["b1"],
      statuses: STATUS_ALL,
    });
    expect(result.map((e) => e.id)).toEqual(["1"]);
  });

  it("returns all barbers when barberIds is empty or undefined", () => {
    const events = [
      evt({ id: "1", barberId: "b1" }),
      evt({ id: "2", barberId: "b2" }),
    ];
    expect(
      filterAgendaEvents(events, { barberIds: [], statuses: STATUS_ALL })
    ).toHaveLength(2);
    expect(
      filterAgendaEvents(events, { statuses: STATUS_ALL })
    ).toHaveLength(2);
  });

  it("filters appointments by status set", () => {
    const events = [
      evt({ id: "res", status: "RESERVED" }),
      evt({ id: "can", status: "CANCELED" }),
      evt({ id: "done", status: "DONE" }),
    ];
    const result = filterAgendaEvents(events, { statuses: STATUS_ACTIVE });
    expect(result.map((e) => e.id)).toEqual(["res"]);
  });

  it("BLOCK events pass when showBlocks is true (default)", () => {
    const events = [
      evt({ id: "block", kind: "BLOCK", status: "ACTIVE" }),
      evt({ id: "appt", status: "DONE" }),
    ];
    const result = filterAgendaEvents(events, { statuses: STATUS_ACTIVE });
    expect(result.map((e) => e.id).sort()).toEqual(["block"]);
  });

  it("BLOCK events can be hidden", () => {
    const events = [
      evt({ id: "block", kind: "BLOCK", status: "ACTIVE" }),
      evt({ id: "appt", status: "RESERVED" }),
    ];
    const result = filterAgendaEvents(events, {
      statuses: STATUS_ACTIVE,
      showBlocks: false,
    });
    expect(result.map((e) => e.id)).toEqual(["appt"]);
  });

  it("UNAVAILABLE events always pass for allowed barbers regardless of statuses", () => {
    const events = [
      evt({ id: "u1", kind: "UNAVAILABLE", barberId: "b1", status: "ACTIVE" }),
      evt({ id: "u2", kind: "UNAVAILABLE", barberId: "b2", status: "ACTIVE" }),
      evt({ id: "appt", status: "RESERVED", barberId: "b1" }),
    ];
    const result = filterAgendaEvents(events, {
      barberIds: ["b1"],
      statuses: [], // no statuses allowed
    });
    // u1 passes (unavailable for b1), u2 filtered (wrong barber), appt filtered (no status match)
    expect(result.map((e) => e.id)).toEqual(["u1"]);
  });
});
