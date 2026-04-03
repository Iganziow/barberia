import { describe, it, expect } from "vitest";
import { STATUS_CONFIG } from "@/lib/constants";

describe("STATUS_CONFIG", () => {
  const statuses = ["RESERVED", "CONFIRMED", "ARRIVED", "IN_PROGRESS", "DONE", "CANCELED", "NO_SHOW"];

  it("has all 7 appointment statuses", () => {
    for (const status of statuses) {
      expect(STATUS_CONFIG[status]).toBeDefined();
    }
  });

  it("each status has required fields", () => {
    for (const status of statuses) {
      const cfg = STATUS_CONFIG[status];
      expect(cfg.label).toBeTruthy();
      expect(cfg.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(cfg.bg).toMatch(/^bg-/);
      expect(cfg.text).toMatch(/^text-/);
      expect(cfg.dot).toMatch(/^bg-/);
    }
  });

  it("labels are in Spanish", () => {
    expect(STATUS_CONFIG.RESERVED.label).toBe("Pendiente");
    expect(STATUS_CONFIG.DONE.label).toBe("Completado");
    expect(STATUS_CONFIG.NO_SHOW.label).toBe("No asistió");
  });
});
