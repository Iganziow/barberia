import { describe, it, expect } from "vitest";
import {
  computeUnavailableBlocks,
  hhmmToMinutes,
} from "@/features/admin/agenda/barberScheduleBlocks";
import type { BarberScheduleEntry } from "@/types/agenda";

function dayAt(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

describe("hhmmToMinutes", () => {
  it("parses HH:mm", () => {
    expect(hhmmToMinutes("00:00")).toBe(0);
    expect(hhmmToMinutes("09:00")).toBe(540);
    expect(hhmmToMinutes("09:30")).toBe(570);
    expect(hhmmToMinutes("21:00")).toBe(1260);
  });
});

describe("computeUnavailableBlocks", () => {
  const visibleRange = { from: "08:00", to: "20:00" };

  it("returns nothing when visible range is invalid (to <= from)", () => {
    const blocks = computeUnavailableBlocks({
      schedules: [],
      barberIds: ["b1"],
      fromDay: dayAt(2026, 4, 14),
      toDay: dayAt(2026, 4, 14),
      visibleRange: { from: "20:00", to: "08:00" },
    });
    expect(blocks).toHaveLength(0);
  });

  it("marks full day unavailable when barber has no schedule for that day", () => {
    const blocks = computeUnavailableBlocks({
      schedules: [],
      barberIds: ["b1"],
      fromDay: dayAt(2026, 4, 14), // martes
      toDay: dayAt(2026, 4, 14),
      visibleRange,
    });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].title).toBe("Profesional no disponible");
    expect(blocks[0].barberId).toBe("b1");
    expect(blocks[0].kind).toBe("UNAVAILABLE");
  });

  it("marks full day unavailable when isWorking is false", () => {
    const tuesday = dayAt(2026, 4, 14);
    const schedules: BarberScheduleEntry[] = [
      {
        barberId: "b1",
        dayOfWeek: tuesday.getDay(),
        startTime: "09:00",
        endTime: "18:00",
        isWorking: false,
      },
    ];
    const blocks = computeUnavailableBlocks({
      schedules,
      barberIds: ["b1"],
      fromDay: tuesday,
      toDay: tuesday,
      visibleRange,
    });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toContain("full");
  });

  it("emits a 'before' gap when schedule starts after visible.from", () => {
    const tue = dayAt(2026, 4, 14);
    const schedules: BarberScheduleEntry[] = [
      {
        barberId: "b1",
        dayOfWeek: tue.getDay(),
        startTime: "09:00",
        endTime: "20:00",
        isWorking: true,
      },
    ];
    const blocks = computeUnavailableBlocks({
      schedules,
      barberIds: ["b1"],
      fromDay: tue,
      toDay: tue,
      visibleRange,
    });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toContain("before");
  });

  it("emits an 'after' gap when schedule ends before visible.to", () => {
    const tue = dayAt(2026, 4, 14);
    const schedules: BarberScheduleEntry[] = [
      {
        barberId: "b1",
        dayOfWeek: tue.getDay(),
        startTime: "08:00",
        endTime: "15:00",
        isWorking: true,
      },
    ];
    const blocks = computeUnavailableBlocks({
      schedules,
      barberIds: ["b1"],
      fromDay: tue,
      toDay: tue,
      visibleRange,
    });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toContain("after");
  });

  it("emits both before and after gaps when schedule is fully inside visible range", () => {
    const tue = dayAt(2026, 4, 14);
    const schedules: BarberScheduleEntry[] = [
      {
        barberId: "b1",
        dayOfWeek: tue.getDay(),
        startTime: "09:00",
        endTime: "18:00",
        isWorking: true,
      },
    ];
    const blocks = computeUnavailableBlocks({
      schedules,
      barberIds: ["b1"],
      fromDay: tue,
      toDay: tue,
      visibleRange,
    });
    expect(blocks).toHaveLength(2);
    expect(blocks.some((b) => b.id.includes("before"))).toBe(true);
    expect(blocks.some((b) => b.id.includes("after"))).toBe(true);
  });

  it("emits no blocks when schedule covers or exceeds visible range", () => {
    const tue = dayAt(2026, 4, 14);
    const schedules: BarberScheduleEntry[] = [
      {
        barberId: "b1",
        dayOfWeek: tue.getDay(),
        startTime: "07:00",
        endTime: "22:00",
        isWorking: true,
      },
    ];
    const blocks = computeUnavailableBlocks({
      schedules,
      barberIds: ["b1"],
      fromDay: tue,
      toDay: tue,
      visibleRange,
    });
    expect(blocks).toHaveLength(0);
  });

  it("handles multiple barbers independently", () => {
    const tue = dayAt(2026, 4, 14);
    const schedules: BarberScheduleEntry[] = [
      {
        barberId: "b1",
        dayOfWeek: tue.getDay(),
        startTime: "08:00",
        endTime: "20:00",
        isWorking: true,
      },
      // b2 has no schedule → full day unavailable
    ];
    const blocks = computeUnavailableBlocks({
      schedules,
      barberIds: ["b1", "b2"],
      fromDay: tue,
      toDay: tue,
      visibleRange,
    });
    expect(blocks.filter((b) => b.barberId === "b1")).toHaveLength(0);
    expect(blocks.filter((b) => b.barberId === "b2")).toHaveLength(1);
  });

  it("iterates over multiple days", () => {
    const mon = dayAt(2026, 4, 13);
    const wed = dayAt(2026, 4, 15);
    const schedules: BarberScheduleEntry[] = [
      {
        barberId: "b1",
        dayOfWeek: mon.getDay(),
        startTime: "08:00",
        endTime: "20:00",
        isWorking: true,
      },
      // Nothing for tuesday or wednesday → full day unavailable
    ];
    const blocks = computeUnavailableBlocks({
      schedules,
      barberIds: ["b1"],
      fromDay: mon,
      toDay: wed,
      visibleRange,
    });
    expect(blocks).toHaveLength(2); // Tue + Wed full days
  });
});
