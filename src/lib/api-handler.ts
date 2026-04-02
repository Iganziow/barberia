import { NextResponse } from "next/server";
import { requireAdmin, requireBarber } from "@/lib/api-auth";
import { AppError } from "@/lib/api-error";
import type { JwtPayload } from "@/lib/auth";

type AuthContext = {
  orgId: string;
  userId: string;
  payload: JwtPayload & { exp: number; iat: number };
};

type RouteParams = { params: Promise<Record<string, string>> };

/**
 * Wrap an admin API route handler with auth + try-catch + orgId extraction.
 *
 * Before (repeated in every route):
 *   export async function GET(req: Request) {
 *     const auth = await requireAdmin();
 *     if (!auth.ok) return auth.response;
 *     const orgId = auth.payload.orgId;
 *     try { ... } catch (err) { console.error(...); return 500; }
 *   }
 *
 * After:
 *   export const GET = withAdmin(async (req, ctx) => {
 *     // ctx.orgId, ctx.userId, ctx.payload available
 *     return NextResponse.json({ data });
 *   });
 */
export function withAdmin(
  handler: (req: Request, ctx: AuthContext, routeParams: RouteParams) => Promise<NextResponse>
) {
  return async (req: Request, routeParams: RouteParams) => {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    try {
      return await handler(req, {
        orgId: auth.payload.orgId,
        userId: auth.payload.sub,
        payload: auth.payload,
      }, routeParams);
    } catch (err) {
      if (err instanceof AppError) {
        return NextResponse.json({ message: err.message }, { status: err.statusCode });
      }
      console.error(`${req.method} ${new URL(req.url).pathname} failed:`, err);
      return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
  };
}

/**
 * Wrap a barber API route handler.
 */
export function withBarber(
  handler: (req: Request, ctx: AuthContext, routeParams: RouteParams) => Promise<NextResponse>
) {
  return async (req: Request, routeParams: RouteParams) => {
    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    try {
      return await handler(req, {
        orgId: auth.payload.orgId,
        userId: auth.payload.sub,
        payload: auth.payload,
      }, routeParams);
    } catch (err) {
      if (err instanceof AppError) {
        return NextResponse.json({ message: err.message }, { status: err.statusCode });
      }
      console.error(`${req.method} ${new URL(req.url).pathname} failed:`, err);
      return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
  };
}

/**
 * Wrap a public API route handler (no auth, just try-catch + AppError handling).
 */
export function withPublic(
  handler: (req: Request, routeParams: RouteParams) => Promise<NextResponse>
) {
  return async (req: Request, routeParams: RouteParams) => {
    try {
      return await handler(req, routeParams);
    } catch (err) {
      if (err instanceof AppError) {
        return NextResponse.json({ message: err.message }, { status: err.statusCode });
      }
      console.error(`${req.method} ${new URL(req.url).pathname} failed:`, err);
      return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
  };
}
