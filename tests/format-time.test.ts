import { describe, it, expect } from "vitest";
import { formatTime, formatCLP } from "@/lib/format";

/**
 * Tests del formatter de hora. Defense en regresión del bug UX
 * detectado 2026-04-30: sin hour12:false, `toLocaleTimeString("es-CL", ...)`
 * devuelve "09:00 a. m." en Node/Chrome. La función pública DEBE devolver
 * formato 24h "09:00" para coincidir con el estándar chileno.
 */

describe("formatTime — 24h format (regression guard)", () => {
  it("formats midnight as 00:00 (not 12:00 a. m.)", () => {
    const iso = "2026-06-22T03:00:00Z"; // 00:00 en Chile (UTC-3)
    const result = formatTime(iso);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
    expect(result).not.toContain("a. m.");
    expect(result).not.toContain("p. m.");
  });

  it("formats morning hour without 'a. m.'", () => {
    // 09:00 hora Chile (UTC-3) → 12:00 UTC
    const iso = "2026-06-22T12:00:00Z";
    const result = formatTime(iso);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
    expect(result).not.toContain("a. m.");
  });

  it("formats afternoon hour without 'p. m.' (uses 21:30 not 09:30 p. m.)", () => {
    // 18:30 hora Chile (UTC-3) → 21:30 UTC
    const iso = "2026-06-22T21:30:00Z";
    const result = formatTime(iso);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
    expect(result).not.toContain("p. m.");
    // En 24h: hora chilena 18:30 — el test no asume timezone del runner
    // exactamente; solo verifica que el formato sea 24h.
  });

  it("output has exactly HH:MM shape (4 chars + colon = 5 chars total)", () => {
    const iso = "2026-06-22T15:00:00Z";
    const result = formatTime(iso);
    expect(result).toHaveLength(5);
    expect(result.charAt(2)).toBe(":");
  });

  it("never contains a period (am/pm uses 'a. m.' with periods)", () => {
    for (const h of [0, 1, 11, 12, 13, 23]) {
      const d = new Date(`2026-06-22T${String(h).padStart(2, "0")}:00:00Z`);
      const result = formatTime(d.toISOString());
      expect(result, `Hour ${h} should not contain '.'`).not.toContain(".");
    }
  });
});

describe("formatCLP — currency invariants", () => {
  it("formats integer pesos", () => {
    const result = formatCLP(12000);
    expect(result).toContain("12.000");
  });

  it("uses $ symbol", () => {
    expect(formatCLP(1000)).toContain("$");
  });

  it("zero is rendered, not empty", () => {
    expect(formatCLP(0)).toBeTruthy();
    expect(formatCLP(0)).toContain("0");
  });

  it("no decimals (Chilean pesos are integers)", () => {
    expect(formatCLP(1234)).not.toContain(",");
    // Es-CL puede usar "." como decimal en otros contextos. Verificamos
    // que NO haya ",00" o similar al final.
    expect(formatCLP(1234)).not.toMatch(/[,.]\d{2}$/);
  });
});
