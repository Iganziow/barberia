import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken, type JwtPayload } from "@/lib/auth";

type AuthResult =
  | { ok: true; payload: JwtPayload & { exp: number; iat: number } }
  | { ok: false; response: NextResponse };

export async function requireAdmin(): Promise<AuthResult> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "No autenticado" },
        { status: 401 }
      ),
    };
  }

  try {
    const payload = await verifySessionToken(token);

    if (payload.role !== "ADMIN") {
      return {
        ok: false,
        response: NextResponse.json(
          { message: "Prohibido" },
          { status: 403 }
        ),
      };
    }

    return { ok: true, payload };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Sesión inválida" },
        { status: 401 }
      ),
    };
  }
}

export async function requireBarber(): Promise<AuthResult> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "No autenticado" },
        { status: 401 }
      ),
    };
  }

  try {
    const payload = await verifySessionToken(token);

    if (payload.role !== "BARBER") {
      return {
        ok: false,
        response: NextResponse.json(
          { message: "Prohibido" },
          { status: 403 }
        ),
      };
    }

    return { ok: true, payload };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Sesión inválida" },
        { status: 401 }
      ),
    };
  }
}
