import { NextResponse } from "next/server";
import { requireAdmin, requireBarber, requireSuperAdmin } from "@/lib/api-auth";
import { verifyApiKey } from "@/lib/api-key-auth";
import { AppError } from "@/lib/api-error";
import type { JwtPayload } from "@/lib/auth";

type AuthContext = {
  orgId: string;
  userId: string;
};

type RouteParams = { params: Promise<Record<string, string>> };

type AuthResult =
  | { ok: true; payload: JwtPayload & { exp: number; iat: number } }
  | { ok: false; response: NextResponse };

function handleError(req: Request, err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json({ message: err.message }, { status: err.statusCode });
  }

  let pathname: string;
  try { pathname = new URL(req.url).pathname; } catch { pathname = req.url; }
  console.error(`${req.method} ${pathname} failed:`, err);

  return NextResponse.json({ message: "Error interno" }, { status: 500 });
}

function withAuth(
  authFn: () => Promise<AuthResult>,
  handler: (req: Request, ctx: AuthContext, routeParams: RouteParams) => Promise<NextResponse>
) {
  return async (req: Request, routeParams: RouteParams) => {
    const auth = await authFn();
    if (!auth.ok) return auth.response;

    try {
      return await handler(req, {
        orgId: auth.payload.orgId,
        userId: auth.payload.sub,
      }, routeParams);
    } catch (err: unknown) {
      return handleError(req, err);
    }
  };
}

export function withAdmin(
  handler: (req: Request, ctx: AuthContext, routeParams: RouteParams) => Promise<NextResponse>
) {
  return withAuth(requireAdmin, handler);
}

export function withSuperAdmin(
  handler: (req: Request, ctx: AuthContext, routeParams: RouteParams) => Promise<NextResponse>
) {
  return withAuth(requireSuperAdmin, handler);
}

export function withBarber(
  handler: (req: Request, ctx: AuthContext, routeParams: RouteParams) => Promise<NextResponse>
) {
  return withAuth(requireBarber, handler);
}

type ApiKeyContext = { orgId: string };

export function withApiKey(
  handler: (req: Request, ctx: ApiKeyContext, routeParams: RouteParams) => Promise<NextResponse>
) {
  return async (req: Request, routeParams: RouteParams) => {
    try {
      const auth = await verifyApiKey(req);
      if (!auth) {
        return NextResponse.json(
          { message: "API key inválida o no proporcionada" },
          { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
        );
      }
      return await handler(req, { orgId: auth.orgId }, routeParams);
    } catch (err: unknown) {
      return handleError(req, err);
    }
  };
}

export function withPublic(
  handler: (req: Request, routeParams: RouteParams) => Promise<NextResponse>
) {
  return async (req: Request, routeParams: RouteParams) => {
    try {
      return await handler(req, routeParams);
    } catch (err: unknown) {
      return handleError(req, err);
    }
  };
}
