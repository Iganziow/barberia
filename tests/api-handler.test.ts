import { describe, it, expect } from "vitest";
import { AppError } from "@/lib/api-error";

describe("AppError in handler context", () => {
  it("can be caught and matched by instanceof", () => {
    function simulateHandler(): never {
      throw AppError.notFound("Cita no encontrada");
    }

    try {
      simulateHandler();
    } catch (err: unknown) {
      expect(err instanceof AppError).toBe(true);
      expect(err instanceof Error).toBe(true);
      if (err instanceof AppError) {
        expect(err.statusCode).toBe(404);
        expect(err.message).toBe("Cita no encontrada");
      }
    }
  });

  it("non-AppError falls through to generic handler", () => {
    function simulateHandler(): never {
      throw new Error("Prisma connection failed");
    }

    try {
      simulateHandler();
    } catch (err: unknown) {
      expect(err instanceof AppError).toBe(false);
      expect(err instanceof Error).toBe(true);
    }
  });

  it("all factory methods produce correct status codes", () => {
    const cases: Array<[() => AppError, number]> = [
      [() => AppError.badRequest(), 400],
      [() => AppError.unauthorized(), 401],
      [() => AppError.forbidden(), 403],
      [() => AppError.notFound(), 404],
      [() => AppError.conflict(), 409],
    ];

    for (const [factory, expectedStatus] of cases) {
      const err = factory();
      expect(err.statusCode).toBe(expectedStatus);
    }
  });
});

describe("Rate limiter integration", () => {
  it("allows burst then blocks", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const ip = "burst-test-" + Date.now();

    // 5 requests allowed
    for (let i = 0; i < 5; i++) {
      const r = rateLimit(ip, { maxRequests: 5, windowMs: 10000 });
      expect(r.allowed).toBe(true);
    }

    // 6th blocked
    const blocked = rateLimit(ip, { maxRequests: 5, windowMs: 10000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
