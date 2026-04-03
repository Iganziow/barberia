import { describe, it, expect } from "vitest";
import { formatCLP } from "@/lib/format";

describe("formatCLP", () => {
  it("formats positive number as CLP", () => {
    const result = formatCLP(12000);
    expect(result).toContain("12.000");
  });

  it("formats zero", () => {
    const result = formatCLP(0);
    expect(result).toContain("0");
  });

  it("formats negative number", () => {
    const result = formatCLP(-5000);
    expect(result).toContain("5.000");
  });

  it("has no decimal places", () => {
    const result = formatCLP(12345);
    expect(result).not.toContain(",");
  });
});
