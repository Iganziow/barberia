/**
 * Typed application errors.
 * Throw these from services/routes — the handler wrapper catches them
 * and returns the correct HTTP status + message.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message = "Datos inválidos") {
    return new AppError(400, message);
  }

  static unauthorized(message = "No autenticado") {
    return new AppError(401, message);
  }

  static forbidden(message = "Acceso denegado") {
    return new AppError(403, message);
  }

  static notFound(message = "Recurso no encontrado") {
    return new AppError(404, message);
  }

  static conflict(message = "Conflicto") {
    return new AppError(409, message);
  }
}
