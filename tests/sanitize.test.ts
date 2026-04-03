import { describe, it, expect } from "vitest";
import { stripHtml, parseDate } from "@/lib/sanitize";

describe("stripHtml", () => {
  it("removes script tags", () => {
    expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it("removes nested HTML", () => {
    expect(stripHtml("<b><i>Bold</i></b>")).toBe("Bold");
  });

  it("preserves plain text", () => {
    expect(stripHtml("Juan Pérez")).toBe("Juan Pérez");
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });

  it("trims whitespace", () => {
    expect(stripHtml("  hello  ")).toBe("hello");
  });

  it("removes img with onerror", () => {
    expect(stripHtml('<img src=x onerror=alert(1)>')).toBe("");
  });
});

describe("parseDate", () => {
  it("parses valid ISO date", () => {
    const d = parseDate("2026-04-01T10:00:00.000Z");
    expect(d).toBeInstanceOf(Date);
    expect(d!.getFullYear()).toBe(2026);
  });

  it("returns null for invalid date", () => {
    expect(parseDate("not-a-date")).toBeNull();
  });

  it("returns null for SQL injection attempt", () => {
    expect(parseDate("'; DROP TABLE;--")).toBeNull();
  });

  it("parses date-only string", () => {
    const d = parseDate("2026-04-01");
    expect(d).toBeInstanceOf(Date);
  });
});
