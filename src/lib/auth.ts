import { SignJWT } from "jose";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

// Re-exports edge-safe (tipos + AUTH_COOKIE_NAME + verifyJwtSignature)
// para que los archivos que importan de auth.ts no necesiten saber el split.
export {
  AUTH_COOKIE_NAME,
  verifyJwtSignature,
  type JwtRole,
  type JwtPayload,
  type VerifiedJwtPayload,
} from "./auth-edge";

import type { JwtPayload, VerifiedJwtPayload } from "./auth-edge";
import { verifyJwtSignature } from "./auth-edge";

const secret = process.env.JWT_SECRET ?? "";
const key = new TextEncoder().encode(secret);

function ensureSecret() {
  if (!secret) throw new Error("JWT_SECRET is missing in environment variables.");
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production.");
  }
}

const SESSION_DAYS = 7;

export function getCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/" as const,
  };
}

/**
 * Firma un JWT y registra una Session row en DB. El `jti` se embebe
 * en el token; al verificar, chequeamos que la session existe y NO
 * está revocada → JWTs revocables server-side.
 */
export async function signSessionToken(
  payload: JwtPayload,
  meta?: { ip?: string | null; userAgent?: string | null }
): Promise<string> {
  ensureSecret();

  const jti = randomUUID();
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(`${SESSION_DAYS}d`)
    .setSubject(payload.sub)
    .setJti(jti)
    .sign(key);

  await prisma.session.create({
    data: {
      id: jti,
      userId: payload.sub,
      expiresAt,
      ip: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
    },
  });

  return token;
}

/**
 * Verifica firma + expiración del JWT, Y que la session siga ACTIVA en DB
 * (no revocada). Usar en handlers/layouts (Node runtime).
 */
export async function verifySessionToken(token: string): Promise<VerifiedJwtPayload> {
  const verified = await verifyJwtSignature(token);

  if (!verified.jti) {
    throw new Error("JWT sin jti — token legacy o malformado");
  }

  const session = await prisma.session.findUnique({
    where: { id: verified.jti },
    select: { revokedAt: true, expiresAt: true },
  });
  if (!session) throw new Error("Session not found");
  if (session.revokedAt) throw new Error("Session revoked");
  if (session.expiresAt.getTime() < Date.now()) throw new Error("Session expired");

  return verified;
}

/** Revoca una session específica por jti. Idempotente. */
export async function revokeSession(jti: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: jti, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revoca TODAS las sesiones de un usuario. Devuelve cuántas revocó. */
export async function revokeAllSessionsForUser(userId: string): Promise<number> {
  const r = await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return r.count;
}
