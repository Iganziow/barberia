import { describe, it, expect } from "vitest";
import {
  gridRowCount,
  eventGridRows,
  timeLabels,
  SLOT_MINUTES,
} from "@/features/admin/agenda/agendaGridMath";

describe("SLOT_MINUTES", () => {
  it("is 15", () => {
    expect(SLOT_MINUTES).toBe(15);
  });
});

describe("gridRowCount", () => {
  it("counts rows for the default 09:00-21:00 range", () => {
    expect(gridRowCount({ from: "09:00", to: "21:00" })).toBe(48);
  });

  it("counts rows for a short range", () => {
    expect(gridRowCount({ from: "08:00", to: "09:00" })).toBe(4);
  });

  it("returns 0 when to <= from", () => {
    expect(gridRowCount({ from: "09:00", to: "09:00" })).toBe(0);
    expect(gridRowCount({ from: "21:00", to: "09:00" })).toBe(0);
  });
});

describe("eventGridRows", () => {
  const dayStart = new Date(2026, 3, 14, 0, 0, 0, 0); // 14 apr 2026 00:00 local
  const range = { from: "09:00", to: "21:00" };

  function iso(h: number, m = 0): string {
    const d = new Date(dayStart);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  it("maps 09:00-10:00 to rows 1..5", () => {
    const r = eventGridRows(iso(9), iso(10), dayStart, range);
    expect(r).toEqual({ startRow: 1, endRow: 5 });
  });

  it("maps 09:15-09:45 to rows 2..4", () => {
    const r = eventGridRows(iso(9, 15), iso(9, 45), dayStart, range);
    expect(r).toEqual({ startRow: 2, endRow: 4 });
  });

  it("clamps events that start before visible range", () => {
    const r = eventGridRows(iso(8), iso(10), dayStart, range);
    expect(r).toEqual({ startRow: 1, endRow: 5 });
  });

  it("clamps events that end after visible range", () => {
    const r = eventGridRows(iso(20), iso(22), dayStart, range);
    expect(r).toEqual({ startRow: 45, endRow: 49 });
  });

  it("returns null for events fully outside visible range", () => {
    expect(eventGridRows(iso(7), iso(8), dayStart, range)).toBeNull();
    expect(eventGridRows(iso(22), iso(23), dayStart, range)).toBeNull();
  });
});

describe("timeLabels", () => {
  it("returns labels for each 15-minute slot", () => {
    const labels = timeLabels({ from: "09:00", to: "10:00" });
    expect(labels.map((l) => l.label)).toEqual([
      "09:00",
      "09:15",
      "09:30",
      "09:45",
    ]);
  });

  it("marks on-the-hour labels", () => {
    const labels = timeLabels({ from: "09:00", to: "10:00" });
    expect(labels[0].onTheHour).toBe(true);
    expect(labels[1].onTheHour).toBe(false);
  });

  it("uses sequential row numbers starting at 1", () => {
    const labels = timeLabels({ from: "09:00", to: "10:00" });
    expect(labels.map((l) => l.row)).toEqual([1, 2, 3, 4]);
  });
});
