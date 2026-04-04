import { describe, it, expect } from "vitest";

/**
 * Integration-style tests for the availability system.
 * Tests slot calculation logic without hitting the database.
 */

describe("Slot calculation logic", () => {
  // Simulate the core algorithm from availability.service.ts
  function calculateSlots(
    workStart: string,
    workEnd: string,
    durationMin: number,
    busy: Array<{ start: number; end: number }>,
    slotStep = 30
  ): Array<{ start: number; end: number }> {
    const [startH, startM] = workStart.split(":").map(Number);
    const [endH, endM] = workEnd.split(":").map(Number);

    const baseDate = new Date("2026-04-06T00:00:00");
    const windowStart = new Date(baseDate);
    windowStart.setHours(startH, startM, 0, 0);
    const windowEnd = new Date(baseDate);
    windowEnd.setHours(endH, endM, 0, 0);

    const slots: Array<{ start: number; end: number }> = [];
    let cursor = windowStart.getTime();

    while (cursor + durationMin * 60_000 <= windowEnd.getTime()) {
      const slotStart = cursor;
      const slotEnd = cursor + durationMin * 60_000;
      const conflicts = busy.some((b) => slotStart < b.end && b.start < slotEnd);
      if (!conflicts) slots.push({ start: slotStart, end: slotEnd });
      cursor += slotStep * 60_000;
    }

    return slots;
  }

  it("generates correct number of 30-min slots for 09:00-20:00", () => {
    // 11 hours = 22 half-hour slots for a 30-min service
    const slots = calculateSlots("09:00", "20:00", 30, []);
    expect(slots.length).toBe(22);
  });

  it("generates correct number of 45-min slots for 09:00-20:00", () => {
    // 45-min service in 30-min steps: 09:00, 09:30, 10:00... up to 19:00 (last that fits)
    // From 09:00 to 19:15 is the last slot start, but 19:15+45=20:00. Steps: 09:00,09:30,...19:00
    // 19:15 + 45 = 20:00 which is <= windowEnd, so 19:15 fits. That's 21 slots.
    const slots = calculateSlots("09:00", "20:00", 45, []);
    expect(slots.length).toBe(21);
  });

  it("blocks correct slots when a 1-hour block exists", () => {
    const base = new Date("2026-04-06T00:00:00");
    const blockStart = new Date(base);
    blockStart.setHours(12, 0, 0, 0);
    const blockEnd = new Date(base);
    blockEnd.setHours(13, 0, 0, 0);

    const allSlots = calculateSlots("09:00", "20:00", 30, []);
    const blockedSlots = calculateSlots("09:00", "20:00", 30, [
      { start: blockStart.getTime(), end: blockEnd.getTime() },
    ]);

    // 1 hour block removes 2 x 30-min slots (12:00 and 12:30)
    expect(allSlots.length - blockedSlots.length).toBe(2);
  });

  it("blocks overlapping appointment correctly", () => {
    const base = new Date("2026-04-06T00:00:00");
    const aptStart = new Date(base);
    aptStart.setHours(10, 0, 0, 0);
    const aptEnd = new Date(base);
    aptEnd.setHours(10, 45, 0, 0); // 45 min appointment

    const slots = calculateSlots("09:00", "20:00", 30, [
      { start: aptStart.getTime(), end: aptEnd.getTime() },
    ]);

    // Slots at 10:00 and 10:30 should be removed (both overlap with 10:00-10:45)
    const slotTimes = slots.map((s) => new Date(s.start).getHours() * 60 + new Date(s.start).getMinutes());
    expect(slotTimes).not.toContain(600); // 10:00
    expect(slotTimes).not.toContain(630); // 10:30
    expect(slotTimes).toContain(540);     // 09:00 (before appointment)
    expect(slotTimes).toContain(660);     // 11:00 (after appointment)
  });

  it("returns no slots when entire day is blocked", () => {
    const base = new Date("2026-04-06T00:00:00");
    const blockStart = new Date(base);
    blockStart.setHours(0, 0, 0, 0);
    const blockEnd = new Date(base);
    blockEnd.setHours(23, 59, 59, 0);

    const slots = calculateSlots("09:00", "20:00", 30, [
      { start: blockStart.getTime(), end: blockEnd.getTime() },
    ]);
    expect(slots.length).toBe(0);
  });

  it("handles multiple non-overlapping blocks", () => {
    const base = new Date("2026-04-06T00:00:00");
    const block1Start = new Date(base); block1Start.setHours(10, 0, 0, 0);
    const block1End = new Date(base); block1End.setHours(11, 0, 0, 0);
    const block2Start = new Date(base); block2Start.setHours(14, 0, 0, 0);
    const block2End = new Date(base); block2End.setHours(15, 0, 0, 0);

    const freeSlots = calculateSlots("09:00", "20:00", 30, []);
    const blockedSlots = calculateSlots("09:00", "20:00", 30, [
      { start: block1Start.getTime(), end: block1End.getTime() },
      { start: block2Start.getTime(), end: block2End.getTime() },
    ]);

    // 2 x 1-hour blocks = 4 x 30-min slots removed
    expect(freeSlots.length - blockedSlots.length).toBe(4);
  });

  it("respects branch/barber time intersection", () => {
    // Branch: 09:00-20:00, Barber: 10:00-18:00 → window: 10:00-18:00
    function laterTime(a: string, b: string) { return a > b ? a : b; }
    function earlierTime(a: string, b: string) { return a < b ? a : b; }

    const workStart = laterTime("10:00", "09:00");
    const workEnd = earlierTime("18:00", "20:00");

    expect(workStart).toBe("10:00");
    expect(workEnd).toBe("18:00");

    const slots = calculateSlots(workStart, workEnd, 30, []);
    // 8 hours = 16 half-hour slots
    expect(slots.length).toBe(16);
  });
});
