import { SignJWT, jwtVerify } from "jose";

export type JwtRole = "CLIENT" | "BARBER" | "ADMIN";

export type JwtPayload = {
  sub: string; // userId
  role: JwtRole;
  email: string;
  name: string;
};

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET is missing in environment variables.");

const key = new TextEncoder().encode(secret);

export const AUTH_COOKIE_NAME = "bb_session";

export function getCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    secure: isProd, // en localhost debe ser false
    sameSite: "lax" as const,
    path: "/" as const,
  };
}

export async function signSessionToken(payload: JwtPayload) {
  // 7 días (puedes bajar a 1 día y agregar refresh después)
  const expiresIn = "7d";

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setSubject(payload.sub)
    .sign(key);
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, key);
  return payload as unknown as JwtPayload & { exp: number; iat: number };
}
