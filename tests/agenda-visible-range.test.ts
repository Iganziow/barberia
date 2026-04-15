import { describe, it, expect } from "vitest";
import {
  isValidHHmm,
  isValidRange,
  halfHourSteps,
  DEFAULT_RANGE,
} from "@/features/admin/agenda/agendaVisibleRange";

describe("isValidHHmm", () => {
  it("accepts on-the-hour and on-the-half-hour values", () => {
    expect(isValidHHmm("00:00")).toBe(true);
    expect(isValidHHmm("09:30")).toBe(true);
    expect(isValidHHmm("23:30")).toBe(true);
  });

  it("rejects non-30-minute steps", () => {
    expect(isValidHHmm("09:15")).toBe(false);
    expect(isValidHHmm("09:45")).toBe(false);
  });

  it("rejects out-of-range hours", () => {
    expect(isValidHHmm("24:00")).toBe(false);
    expect(isValidHHmm("-1:00")).toBe(false);
  });

  it("rejects malformed strings", () => {
    expect(isValidHHmm("9:00")).toBe(false);
    expect(isValidHHmm("abc")).toBe(false);
    expect(isValidHHmm("")).toBe(false);
  });
});

describe("isValidRange", () => {
  it("accepts from < to", () => {
    expect(isValidRange({ from: "09:00", to: "21:00" })).toBe(true);
    expect(isValidRange({ from: "08:00", to: "08:30" })).toBe(true);
  });

  it("rejects from >= to", () => {
    expect(isValidRange({ from: "20:00", to: "08:00" })).toBe(false);
    expect(isValidRange({ from: "09:00", to: "09:00" })).toBe(false);
  });

  it("rejects invalid HHmm", () => {
    expect(isValidRange({ from: "9:00", to: "21:00" })).toBe(false);
  });
});

describe("halfHourSteps", () => {
  it("returns 48 steps", () => {
    expect(halfHourSteps()).toHaveLength(48);
  });
  it("starts at 00:00 and ends at 23:30", () => {
    const steps = halfHourSteps();
    expect(steps[0]).toBe("00:00");
    expect(steps[steps.length - 1]).toBe("23:30");
  });
});

describe("DEFAULT_RANGE", () => {
  it("is valid", () => {
    expect(isValidRange(DEFAULT_RANGE)).toBe(true);
  });
});
