import { SignJWT, jwtVerify } from "jose";

export type JwtRole = "CLIENT" | "BARBER" | "ADMIN" | "RECEPTIONIST" | "SUPERADMIN";

export type JwtPayload = {
  sub: string; // userId
  role: JwtRole;
  email: string;
  name: string;
  orgId: string;
};

const secret = process.env.JWT_SECRET ?? "";
const key = new TextEncoder().encode(secret);

function ensureSecret() {
  if (!secret) throw new Error("JWT_SECRET is missing in environment variables.");
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production.");
  }
}

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
  ensureSecret();
  const expiresIn = "7d";

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setSubject(payload.sub)
    .sign(key);
}

export async function verifySessionToken(token: string) {
  ensureSecret();
  const { payload } = await jwtVerify(token, key);
  return payload as unknown as JwtPayload & { exp: number; iat: number };
}
