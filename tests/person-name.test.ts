import { describe, it, expect } from "vitest";
import { personName } from "@/lib/validations/_shared";

/**
 * Tests del schema reutilizable `personName`. Defense in depth contra
 * inputs maliciosos en los 4 lugares que aceptan nombres del usuario:
 * client.ts, waitlist.ts, branch.ts, /api/book/route.ts.
 */

describe("personName — happy path", () => {
  it("acepta nombres normales", () => {
    expect(personName().parse("Juan Pérez")).toBe("Juan Pérez");
    expect(personName().parse("María José")).toBe("María José");
    expect(personName().parse("Ñoño O'Brien")).toBe("Ñoño O'Brien");
  });

  it("trim espacios al inicio y fin", () => {
    expect(personName().parse("  Juan  ")).toBe("Juan");
  });
});

describe("personName — rechazo de HTML", () => {
  it("rechaza < explícitamente", () => {
    expect(() => personName().parse("Juan <hack>")).toThrow();
    expect(() => personName().parse("<script>alert(1)</script>")).toThrow();
    expect(() => personName().parse("Juan < Pérez")).toThrow();
  });

  it("rechaza > explícitamente", () => {
    expect(() => personName().parse("Juan>Pérez")).toThrow();
    expect(() => personName().parse("<>")).toThrow();
  });

  it("rechaza entidades HTML codificadas como texto", () => {
    // < ASCII raw → rechazo
    expect(() => personName().parse("Juan <img src=x>")).toThrow();
  });
});

describe("personName — longitud", () => {
  it("rechaza menor al min (default 2)", () => {
    expect(() => personName().parse("A")).toThrow();
    expect(() => personName().parse("")).toThrow();
  });

  it("rechaza mayor al max (default 200)", () => {
    expect(() => personName().parse("A".repeat(201))).toThrow();
  });

  it("acepta override de min", () => {
    // Para branches que permiten nombres de 1 char (ej. "A").
    expect(personName({ min: 1 }).parse("A")).toBe("A");
  });

  it("acepta override de max", () => {
    expect(personName({ max: 500 }).parse("A".repeat(300))).toHaveLength(300);
  });
});

describe("personName — caracteres especiales válidos", () => {
  it("permite tildes, ñ, apóstrofes, guiones, puntos", () => {
    expect(personName().parse("José María de la Cruz-Pérez")).toBeTruthy();
    expect(personName().parse("Dr. Juan Pérez")).toBeTruthy();
    expect(personName().parse("O'Brien")).toBeTruthy();
  });

  it("permite ampersand (&) — útil para sucursales como 'Smith & Co'", () => {
    expect(personName({ min: 1 }).parse("Smith & Co")).toBe("Smith & Co");
  });
});
