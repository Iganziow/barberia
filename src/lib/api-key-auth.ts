import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Generate a new API key with prefix for identification.
 * Returns { key, keyHash, prefix } — key is shown once, only hash is stored.
 */
export function generateApiKey(): { key: string; keyHash: string; prefix: string } {
  const bytes = randomBytes(32);
  const key = `mb_live_${bytes.toString("base64url")}`;
  const keyHash = hashKey(key);
  const prefix = key.slice(0, 16);
  return { key, keyHash, prefix };
}

/**
 * Hash an API key with SHA-256 for storage/lookup.
 */
export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Verify an API key from the Authorization header.
 * Returns orgId if valid, null if invalid.
 */
export async function verifyApiKey(req: Request): Promise<{ orgId: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const key = authHeader.slice(7);
  if (!key.startsWith("mb_live_")) return null;

  const keyHash = hashKey(key);

  const apiKey = await prisma.apiKey.findFirst({
    where: { keyHash, active: true },
    select: { id: true, orgId: true },
  });

  if (!apiKey) return null;

  // Update last used (fire and forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return { orgId: apiKey.orgId };
}
