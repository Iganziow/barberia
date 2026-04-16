import { describe, it, expect } from "vitest";
import {
  isValidHHmm,
  isValidRange,
  fromSteps,
  toSteps,
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
  it("accepts reasonable barber shop hours", () => {
    expect(isValidRange({ from: "09:00", to: "21:00" })).toBe(true);
    expect(isValidRange({ from: "08:00", to: "20:00" })).toBe(true);
    expect(isValidRange({ from: "06:00", to: "23:00" })).toBe(true);
  });

  it("rejects from >= to or too close", () => {
    expect(isValidRange({ from: "20:00", to: "08:00" })).toBe(false);
    expect(isValidRange({ from: "09:00", to: "09:00" })).toBe(false);
    expect(isValidRange({ from: "09:00", to: "09:30" })).toBe(false);
  });

  it("rejects absurd early hours (before 06:00)", () => {
    expect(isValidRange({ from: "00:30", to: "21:00" })).toBe(false);
    expect(isValidRange({ from: "05:30", to: "21:00" })).toBe(false);
  });

  it("rejects invalid HHmm", () => {
    expect(isValidRange({ from: "9:00", to: "21:00" })).toBe(false);
  });
});

describe("fromSteps", () => {
  it("starts at 06:00", () => {
    expect(fromSteps()[0]).toBe("06:00");
  });
  it("ends at 20:30", () => {
    const steps = fromSteps();
    expect(steps[steps.length - 1]).toBe("20:30");
  });
});

describe("toSteps", () => {
  it("starts at 07:00", () => {
    expect(toSteps()[0]).toBe("07:00");
  });
  it("ends at 23:30", () => {
    const steps = toSteps();
    expect(steps[steps.length - 1]).toBe("23:30");
  });
});

describe("DEFAULT_RANGE", () => {
  it("is valid", () => {
    expect(isValidRange(DEFAULT_RANGE)).toBe(true);
  });
});
