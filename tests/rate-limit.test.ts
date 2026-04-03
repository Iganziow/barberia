import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests under limit", () => {
    const ip = "test-allow-" + Date.now();
    const result = rateLimit(ip, { maxRequests: 5, windowMs: 1000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks requests over limit", () => {
    const ip = "test-block-" + Date.now();
    for (let i = 0; i < 3; i++) {
      rateLimit(ip, { maxRequests: 3, windowMs: 10000 });
    }
    const result = rateLimit(ip, { maxRequests: 3, windowMs: 10000 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks different IPs independently", () => {
    const ts = Date.now();
    const ip1 = "test-ip1-" + ts;
    const ip2 = "test-ip2-" + ts;

    for (let i = 0; i < 3; i++) {
      rateLimit(ip1, { maxRequests: 3, windowMs: 10000 });
    }

    const r1 = rateLimit(ip1, { maxRequests: 3, windowMs: 10000 });
    const r2 = rateLimit(ip2, { maxRequests: 3, windowMs: 10000 });

    expect(r1.allowed).toBe(false);
    expect(r2.allowed).toBe(true);
  });

  it("resets after window expires", async () => {
    const ip = "test-reset-" + Date.now();
    for (let i = 0; i < 3; i++) {
      rateLimit(ip, { maxRequests: 3, windowMs: 100 });
    }

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 150));

    const result = rateLimit(ip, { maxRequests: 3, windowMs: 100 });
    expect(result.allowed).toBe(true);
  });
});
