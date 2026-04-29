import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-error";

// In-memory cache for slug → orgId resolution
const slugCache = new Map<string, { orgId: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function resolveOrgIdBySlug(slug: string): Promise<string | null> {
  const cached = slugCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) return cached.orgId;

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (org) {
    slugCache.set(slug, { orgId: org.id, expiresAt: Date.now() + CACHE_TTL });
    return org.id;
  }
  return null;
}

/**
 * Get orgId from request headers or query params.
 * Priority: x-org-id (JWT) → x-org-slug header → slug query param → bb_org cookie → DEFAULT_ORG_SLUG env
 */
export async function getOrgIdFromHeaders(req?: Request): Promise<string> {
  const h = await headers();

  // 1. Direct orgId from JWT (admin routes)
  const orgId = h.get("x-org-id");
  if (orgId) return orgId;

  // 2. Slug from middleware header — si VIENE pero NO resuelve, 404 inmediato
  // (no caemos al env fallback que sería un leak entre tenants).
  const slugHeader = h.get("x-org-slug");
  if (slugHeader) {
    const resolved = await resolveOrgIdBySlug(slugHeader);
    if (resolved) return resolved;
    throw AppError.notFound("Negocio no encontrado");
  }

  // 3. Slug from query param (public pages pass ?slug=xxx) — misma regla:
  // si vino slug query pero no resuelve, 404 — NO caer al env fallback.
  // Antes caía y devolvía datos del default org → leak multi-tenant.
  if (req) {
    const url = new URL(req.url);
    const slugParam = url.searchParams.get("slug");
    if (slugParam) {
      const resolved = await resolveOrgIdBySlug(slugParam);
      if (resolved) return resolved;
      throw AppError.notFound("Negocio no encontrado");
    }
  }

  // 4. DEFAULT_ORG_SLUG env fallback — solo si NO vino ningún slug explícito.
  // Útil para llamadas internas / dev tools que no pasan slug.
  const envSlug = process.env.DEFAULT_ORG_SLUG;
  if (envSlug) {
    const resolved = await resolveOrgIdBySlug(envSlug);
    if (resolved) return resolved;
  }

  throw AppError.notFound("Negocio no encontrado");
}

/**
 * Try to get orgId from headers, return null if not available.
 */
export async function getOrgIdFromHeadersSafe(): Promise<string | null> {
  const h = await headers();
  return h.get("x-org-id");
}

/**
 * Verify a branch belongs to the given org.
 */
export async function verifyBranchBelongsToOrg(
  branchId: string,
  orgId: string
): Promise<boolean> {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, orgId },
    select: { id: true },
  });
  return !!branch;
}

/**
 * Verify a barber belongs to the given org (via branch).
 */
export async function verifyBarberBelongsToOrg(
  barberId: string,
  orgId: string
): Promise<boolean> {
  const barber = await prisma.barber.findFirst({
    where: { id: barberId, branch: { orgId } },
    select: { id: true },
  });
  return !!barber;
}
