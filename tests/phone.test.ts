import { describe, it, expect } from "vitest";
import {
  digitsOnly,
  normalizeChileanLocal,
  formatChileanPhone,
  isValidChileanPhone,
  toE164ChileanPhone,
} from "@/lib/phone";

describe("digitsOnly", () => {
  it("strips everything except digits", () => {
    expect(digitsOnly("+56 9 1234 5678")).toBe("56912345678");
    expect(digitsOnly("(02) 2345-6789")).toBe("0223456789");
    expect(digitsOnly("abc123")).toBe("123");
    expect(digitsOnly("")).toBe("");
  });
});

describe("normalizeChileanLocal", () => {
  it("strips +56 prefix when present", () => {
    expect(normalizeChileanLocal("+56 9 1234 5678")).toBe("912345678");
    expect(normalizeChileanLocal("56912345678")).toBe("912345678");
  });

  it("returns local number unchanged if no prefix", () => {
    expect(normalizeChileanLocal("912345678")).toBe("912345678");
  });

  it("truncates to 9 digits", () => {
    expect(normalizeChileanLocal("9123456789999")).toBe("912345678");
  });

  it("returns empty for empty input", () => {
    expect(normalizeChileanLocal("")).toBe("");
  });
});

describe("formatChileanPhone", () => {
  it("formats progressively as user types", () => {
    expect(formatChileanPhone("")).toBe("");
    expect(formatChileanPhone("9")).toBe("+56 9");
    expect(formatChileanPhone("91")).toBe("+56 9 1");
    expect(formatChileanPhone("9123")).toBe("+56 9 123");
    expect(formatChileanPhone("91234")).toBe("+56 9 1234");
    expect(formatChileanPhone("912345")).toBe("+56 9 1234 5");
    expect(formatChileanPhone("912345678")).toBe("+56 9 1234 5678");
  });

  it("handles input with existing prefix", () => {
    expect(formatChileanPhone("+56 9 1234 5678")).toBe("+56 9 1234 5678");
    expect(formatChileanPhone("56912345678")).toBe("+56 9 1234 5678");
  });

  it("ignores non-digit characters", () => {
    expect(formatChileanPhone("9-12-34-56-78")).toBe("+56 9 1234 5678");
  });
});

describe("isValidChileanPhone", () => {
  it("accepts valid mobile (starts with 9, 9 digits)", () => {
    expect(isValidChileanPhone("912345678")).toBe(true);
    expect(isValidChileanPhone("+56 9 1234 5678")).toBe(true);
  });

  it("rejects too short", () => {
    expect(isValidChileanPhone("12345")).toBe(false);
    expect(isValidChileanPhone("")).toBe(false);
  });

  it("rejects numbers starting with 0 or 1", () => {
    expect(isValidChileanPhone("012345678")).toBe(false);
    expect(isValidChileanPhone("123456789")).toBe(false);
  });

  it("accepts landline (e.g. starts with 2)", () => {
    expect(isValidChileanPhone("223456789")).toBe(true);
  });
});

describe("toE164ChileanPhone", () => {
  it("returns +56 prefix for valid input", () => {
    expect(toE164ChileanPhone("912345678")).toBe("+56912345678");
    expect(toE164ChileanPhone("+56 9 1234 5678")).toBe("+56912345678");
  });

  it("returns null for invalid input", () => {
    expect(toE164ChileanPhone("")).toBe(null);
    expect(toE164ChileanPhone("12345")).toBe(null);
    expect(toE164ChileanPhone("012345678")).toBe(null);
  });
});
