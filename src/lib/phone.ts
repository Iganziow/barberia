/**
 * Utilidades para teléfono chileno.
 *
 * Reglas:
 * - Móviles: +56 9 XXXX XXXX (9 dígitos después del 56, empezando con 9)
 * - Fijos: +56 X XXXX XXXX (9 dígitos después del 56, sin restricción de inicio)
 * - Aceptamos input con o sin +56 / con o sin espacios.
 *
 * `formatChileanPhone` formatea progresivamente mientras el usuario escribe.
 * `isValidChileanPhone` valida solo cuando el usuario terminó (9 dígitos
 * de cliente + prefijo opcional).
 * `digitsOnly` deja solo los dígitos para envío al backend.
 */

/** Strip todo lo que no sea dígito. */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Normaliza un input a los 9 dígitos del cliente (sin prefijo país).
 * - "+56 9 1234 5678" → "912345678"
 * - "912345678"        → "912345678"
 * - "56912345678"      → "912345678"
 */
export function normalizeChileanLocal(input: string): string {
  let digits = digitsOnly(input);
  if (digits.startsWith("56") && digits.length > 9) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 9);
}

/**
 * Formatea progresivamente para mostrar mientras el usuario escribe.
 * Acepta cualquier input parcial y devuelve "+56 9 1234 5678" (con espacios).
 *
 * Ejemplos:
 *   ""              → ""
 *   "9"             → "+56 9"
 *   "912"           → "+56 9 12"
 *   "9123"          → "+56 9 123"
 *   "91234567"      → "+56 9 1234 567"
 *   "912345678"     → "+56 9 1234 5678"
 */
export function formatChileanPhone(input: string): string {
  const local = normalizeChileanLocal(input);
  if (local.length === 0) return "";

  const a = local.slice(0, 1);
  const b = local.slice(1, 5);
  const c = local.slice(5, 9);

  let out = "+56 " + a;
  if (b) out += " " + b;
  if (c) out += " " + c;
  return out;
}

/**
 * Verdadero si el input es un teléfono chileno válido (9 dígitos locales,
 * empezando preferentemente con 9 para móviles).
 */
export function isValidChileanPhone(input: string): boolean {
  const local = normalizeChileanLocal(input);
  // 9 dígitos exactos. Móviles deben empezar con 9.
  if (local.length !== 9) return false;
  // Permitimos fijos (cualquier dígito inicial) pero rechazamos 0/1 al inicio
  // que no son válidos en CL.
  if (local[0] === "0" || local[0] === "1") return false;
  return true;
}

/**
 * Versión normalizada para enviar al backend: "+56XXXXXXXXX" sin espacios.
 * Devuelve null si el input no es válido.
 */
export function toE164ChileanPhone(input: string): string | null {
  const local = normalizeChileanLocal(input);
  if (!isValidChileanPhone(local)) return null;
  return "+56" + local;
}
