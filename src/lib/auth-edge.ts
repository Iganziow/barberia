import { jwtVerify } from "jose";

/**
 * Edge-safe utilities. El middleware corre en Edge Runtime que NO permite:
 *   - import { ... } from "crypto"  (use global crypto.randomUUID() instead)
 *   - prisma client
 *
 * Por eso este archivo SOLO tiene cripto-light (jose) + tipos. Los
 * helpers que tocan DB viven en auth.ts (Node runtime).
 */

export type JwtRole = "CLIENT" | "BARBER" | "ADMIN" | "RECEPTIONIST" | "SUPERADMIN";

export type JwtPayload = {
  sub: string;
  role: JwtRole;
  email: string;
  name: string;
  orgId: string;
};

export type VerifiedJwtPayload = JwtPayload & {
  jti: string;
  iat: number;
  exp: number;
};

export const AUTH_COOKIE_NAME = "bb_session";

const secret = process.env.JWT_SECRET ?? "";
const key = new TextEncoder().encode(secret);

function ensureSecret() {
  if (!secret) throw new Error("JWT_SECRET is missing in environment variables.");
}

/**
 * Solo verifica firma + expiración del JWT. No toca la DB.
 * Usado por el middleware (Edge Runtime).
 *
 * Significa que un JWT revocado en DB pasa este check — pero los
 * handlers + layouts lo verifican contra DB con verifySessionToken.
 */
export async function verifyJwtSignature(token: string): Promise<VerifiedJwtPayload> {
  ensureSecret();
  const { payload } = await jwtVerify(token, key);
  return payload as unknown as VerifiedJwtPayload;
}
