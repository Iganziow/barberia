import { describe, it, expect } from "vitest";
import { AppError } from "@/lib/api-error";

describe("AppError", () => {
  it("creates 400 bad request", () => {
    const err = AppError.badRequest("test");
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("test");
  });

  it("creates 401 unauthorized", () => {
    const err = AppError.unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("No autenticado");
  });

  it("creates 403 forbidden", () => {
    const err = AppError.forbidden();
    expect(err.statusCode).toBe(403);
  });

  it("creates 404 not found", () => {
    const err = AppError.notFound("Cita no encontrada");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Cita no encontrada");
  });

  it("creates 409 conflict", () => {
    const err = AppError.conflict("Slot taken");
    expect(err.statusCode).toBe(409);
  });

  it("uses default messages", () => {
    expect(AppError.badRequest().message).toBe("Datos inválidos");
    expect(AppError.notFound().message).toBe("Recurso no encontrado");
    expect(AppError.conflict().message).toBe("Conflicto");
  });

  it("is catchable as Error", () => {
    try {
      throw AppError.notFound();
    } catch (err) {
      expect(err instanceof Error).toBe(true);
      expect(err instanceof AppError).toBe(true);
    }
  });
});
