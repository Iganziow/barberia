import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifyJwtSignature } from "@/lib/auth-edge";

/**
 * Resolve org slug from:
 * 1. bb_org cookie (set by public pages under /[slug]/)
 * 2. x-org-slug header (dev/testing)
 * 3. DEFAULT_ORG_SLUG env var (local fallback)
 */
function resolveOrgSlug(req: NextRequest): string | null {
  const cookie = req.cookies.get("bb_org")?.value;
  if (cookie) return cookie;

  const header = req.headers.get("x-org-slug");
  if (header) return header;

  return process.env.DEFAULT_ORG_SLUG || null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const orgSlug = resolveOrgSlug(req);

  const requestHeaders = new Headers(req.headers);
  if (orgSlug) {
    requestHeaders.set("x-org-slug", orgSlug);
  }

  // Admin routes: check JWT + ADMIN role
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    try {
      const payload = await verifyJwtSignature(token);
      if (payload.role !== "ADMIN" && payload.role !== "SUPERADMIN") {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }

      if (payload.orgId) {
        requestHeaders.set("x-org-id", payload.orgId);
      }
    } catch {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Superadmin routes: check JWT + SUPERADMIN role
  if (pathname.startsWith("/superadmin")) {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    try {
      const payload = await verifyJwtSignature(token);
      if (payload.role !== "SUPERADMIN") {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
    } catch {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Barber routes: check JWT + BARBER role
  if (pathname.startsWith("/barber")) {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    try {
      const payload = await verifyJwtSignature(token);
      if (payload.role !== "BARBER") {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }

      if (payload.orgId) {
        requestHeaders.set("x-org-id", payload.orgId);
      }
    } catch {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

// `:path*` en Next.js NO matchea la ruta vacía ("/admin" exacto sin nada
// después). Hay que listar la ruta exacta también, sino /admin sin auth
// devuelve 200 al SSR del page (que después intenta cargar /api/admin/me
// y rebota — pero eso es client-side, ya pasó la barrera del middleware).
//
// Listamos explícitamente cada raíz + sus subpaths para garantizar
// auth-gating server-side completo.
export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/superadmin",
    "/superadmin/:path*",
    "/barber",
    "/barber/:path*",
    "/api/:path*",
  ],
};
