import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getCookieOptions,
  revokeAllSessionsForUser,
  verifySessionToken,
} from "@/lib/auth";
import { recordAudit } from "@/lib/audit-log";

/**
 * Cierra TODAS las sesiones del usuario actual en TODOS los dispositivos.
 *
 * Útil si el usuario sospecha que su cuenta fue comprometida — un click
 * y todos los JWTs que firmamos para él dejan de ser válidos en cualquier
 * dispositivo (móvil, navegador en otro país, etc).
 */
export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
    const token = match?.[1];
    if (!token) {
      return NextResponse.json({ message: "No hay sesión activa" }, { status: 401 });
    }

    let payload;
    try {
      payload = await verifySessionToken(token);
    } catch {
      // Token inválido o ya revocado — borramos cookie igual.
      const res = NextResponse.json({ message: "Sin sesión válida" }, { status: 401 });
      res.cookies.set(AUTH_COOKIE_NAME, "", { ...getCookieOptions(), maxAge: 0 });
      return res;
    }

    const revokedCount = await revokeAllSessionsForUser(payload.sub);

    await recordAudit(
      req,
      {
        userId: payload.sub,
        userEmail: payload.email,
        userRole: payload.role,
        orgId: payload.orgId,
      },
      {
        action: "auth.logout_all",
        metadata: { revokedCount },
      }
    );

    const res = NextResponse.json({
      message: `${revokedCount} sesión${revokedCount === 1 ? "" : "es"} cerrada${revokedCount === 1 ? "" : "s"}`,
      revokedCount,
    });
    // También borramos la cookie del browser actual.
    res.cookies.set(AUTH_COOKIE_NAME, "", { ...getCookieOptions(), maxAge: 0 });
    return res;
  } catch (err) {
    console.error("POST /api/auth/logout-all failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
