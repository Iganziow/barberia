import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  availabilityBranchTag,
  availabilityBarberTag,
  invalidateAvailability,
} from "@/lib/cache/availability-cache";

/**
 * Tests del cache layer de availability. Los tags son strings que se
 * pasan a Next's `unstable_cache` + `revalidateTag`. Si las funciones
 * de generación de tags y las funciones que invalidan no coinciden
 * exactamente, las invalidaciones se silencian sin error y el cache
 * queda stale por hasta 30s. Estos tests fijan el contrato.
 */

// Mock next/cache.revalidateTag — necesitamos verificar QUÉ se invalida
// sin gatillar la lógica real de Next.
const revalidateTagMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (tag: string, profile: string) => revalidateTagMock(tag, profile),
}));

describe("Tag generation — contract estable", () => {
  it("availabilityBranchTag genera 'availability:branch:<id>'", () => {
    expect(availabilityBranchTag("branch-1")).toBe("availability:branch:branch-1");
    expect(availabilityBranchTag("cmqn7a")).toBe("availability:branch:cmqn7a");
  });

  it("availabilityBarberTag genera 'availability:barber:<id>'", () => {
    expect(availabilityBarberTag("barber-1")).toBe("availability:barber:barber-1");
    expect(availabilityBarberTag("cmqnp")).toBe("availability:barber:cmqnp");
  });

  it("tags son determinísticos (mismo id → mismo tag)", () => {
    expect(availabilityBranchTag("x")).toBe(availabilityBranchTag("x"));
    expect(availabilityBarberTag("y")).toBe(availabilityBarberTag("y"));
  });

  it("namespaces separados — branch tag != barber tag para mismo id", () => {
    expect(availabilityBranchTag("same-id")).not.toBe(availabilityBarberTag("same-id"));
  });

  it("ids con caracteres especiales pasan through (no encoding)", () => {
    // Los cuid no incluyen `:` pero verificamos que el helper no encodee
    // si recibiera uno raro — el contrato es "concatenar literal".
    expect(availabilityBranchTag("a:b")).toBe("availability:branch:a:b");
  });
});

describe("invalidateAvailability — wiring con revalidateTag", () => {
  beforeEach(() => {
    revalidateTagMock.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("invalida ambos tags si se pasan ambos ids", () => {
    invalidateAvailability({ barberId: "b1", branchId: "br1" });
    expect(revalidateTagMock).toHaveBeenCalledTimes(2);
    expect(revalidateTagMock).toHaveBeenCalledWith("availability:barber:b1", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("availability:branch:br1", "max");
  });

  it("invalida solo barber si solo se pasa barberId", () => {
    invalidateAvailability({ barberId: "b1" });
    expect(revalidateTagMock).toHaveBeenCalledTimes(1);
    expect(revalidateTagMock).toHaveBeenCalledWith("availability:barber:b1", "max");
  });

  it("invalida solo branch si solo se pasa branchId", () => {
    invalidateAvailability({ branchId: "br1" });
    expect(revalidateTagMock).toHaveBeenCalledTimes(1);
    expect(revalidateTagMock).toHaveBeenCalledWith("availability:branch:br1", "max");
  });

  it("no-op si no se pasa ningún id (defensivo)", () => {
    invalidateAvailability({});
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it('siempre usa el profile "max" (Next 16 requiere segundo argumento)', () => {
    // En Next 16, revalidateTag(tag) sin profile emite deprecation warning.
    // "max" = invalidación inmediata. Si alguien cambia a "default" o omite
    // el profile, este test falla y forzamos revisar.
    invalidateAvailability({ branchId: "any" });
    const profile = revalidateTagMock.mock.calls[0][1];
    expect(profile).toBe("max");
  });
});
