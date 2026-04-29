import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getCookieOptions,
  revokeSession,
  verifyJwtSignature,
} from "@/lib/auth";

/**
 * Cierra la sesión del usuario actual.
 *
 * Hace dos cosas:
 *  1. Revoca la Session row en DB (server-side) — esto invalida el JWT
 *     inmediatamente aunque alguien lo haya robado. Antes el JWT vivía
 *     7 días sin forma de revocarlo.
 *  2. Borra la cookie del browser (client-side).
 *
 * Es idempotente: si la cookie ya estaba vacía o la session ya estaba
 * revocada, no falla.
 */
export async function POST(req: Request) {
  try {
    // Extraer cookie manualmente (NextRequest tipos pueden variar)
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
    const token = match?.[1];

    if (token) {
      try {
        // verifyJwtSignature solo valida cripto (no toca DB) — extraemos
        // el jti aunque la session ya esté revocada.
        const payload = await verifyJwtSignature(token);
        if (payload.jti) {
          await revokeSession(payload.jti);
        }
      } catch {
        // Token inválido/expirado: no podemos revocar nada server-side,
        // pero igual borramos la cookie. No fallamos.
      }
    }

    const res = NextResponse.json({ message: "Sesión cerrada" });
    res.cookies.set(AUTH_COOKIE_NAME, "", {
      ...getCookieOptions(),
      maxAge: 0,
    });
    return res;
  } catch (err) {
    console.error("POST /api/auth/logout failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
