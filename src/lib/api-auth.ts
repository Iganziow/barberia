import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken, type JwtPayload } from "@/lib/auth";

type AuthResult =
  | { ok: true; payload: JwtPayload & { exp: number; iat: number } }
  | { ok: false; response: NextResponse };

function unauthorized(): AuthResult {
  return { ok: false, response: NextResponse.json({ message: "No autenticado" }, { status: 401 }) };
}

function forbidden(): AuthResult {
  return { ok: false, response: NextResponse.json({ message: "Prohibido" }, { status: 403 }) };
}

async function getPayload(): Promise<(JwtPayload & { exp: number; iat: number }) | null> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/** Requires ADMIN or SUPERADMIN role */
export async function requireAdmin(): Promise<AuthResult> {
  const payload = await getPayload();
  if (!payload) return unauthorized();
  if (payload.role !== "ADMIN" && payload.role !== "SUPERADMIN") return forbidden();
  return { ok: true, payload };
}

/** Requires BARBER role only */
export async function requireBarber(): Promise<AuthResult> {
  const payload = await getPayload();
  if (!payload) return unauthorized();
  if (payload.role !== "BARBER") return forbidden();
  return { ok: true, payload };
}

/** Requires SUPERADMIN role only */
export async function requireSuperAdmin(): Promise<AuthResult> {
  const payload = await getPayload();
  if (!payload) return unauthorized();
  if (payload.role !== "SUPERADMIN") return forbidden();
  return { ok: true, payload };
}
