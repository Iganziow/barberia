import { z } from "zod";
import { stripHtml } from "@/lib/sanitize";

/**
 * Schema reusable para nombres de personas/entidades. Hace 3 cosas:
 *
 *   1. Valida longitud (default min 2, max 200).
 *   2. **Rechaza** cualquier `<` o `>` en el input — defense in depth
 *      contra HTML/script injection. `stripHtml` sólo limpia post-hoc;
 *      rechazar primero es más explícito ("este campo no acepta HTML")
 *      y evita que un atacante use técnicas de bypass de la regex.
 *   3. Aplica `stripHtml` de seguro por si pasa algún edge case.
 *
 * Auditoría usabilidad 2026-04-30 DATA-1: encontramos clientes en DB con
 * `name = "<script>alert(1)</script>"` heredados de testing histórico.
 * React escapaba al renderizar (sin XSS activo), pero el dato sucio es
 * una mancha. Este helper bloquea futuras escrituras del patrón.
 */
export function personName(opts?: { min?: number; max?: number }) {
  const min = opts?.min ?? 2;
  const max = opts?.max ?? 200;
  return z
    .string()
    .min(min)
    .max(max)
    .refine((s) => !/[<>]/.test(s), {
      message: "El nombre no puede contener < o >.",
    })
    .transform((s) => stripHtml(s.trim()));
}
