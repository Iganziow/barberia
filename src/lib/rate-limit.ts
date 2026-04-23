/**
 * Simple in-memory rate limiter for public endpoints.
 * Limits requests per IP address within a sliding window.
 */

const store = new Map<string, { count: number; resetAt: number }>();

// Techo de entradas para prevenir OOM en in-memory. 10k IPs activas es
// más que suficiente para un SaaS de ~100 clientes; cuando se supera,
// hacemos cleanup de entradas vencidas en la siguiente llamada. Si necesitas
// escalar a más tráfico, mueve este store a Redis o Upstash.
const MAX_STORE_SIZE = 10000;

export function rateLimit(
  ip: string,
  { maxRequests = 20, windowMs = 60_000 } = {}
): { allowed: boolean; remaining: number } {
  const now = Date.now();

  // Cleanup if store is too large
  if (store.size > MAX_STORE_SIZE) {
    for (const [key, val] of store) {
      if (val.resetAt < now) store.delete(key);
    }
  }

  const entry = store.get(ip);

  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: maxRequests - entry.count };
}
