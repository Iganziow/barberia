import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME,
  getCookieOptions,
  signSessionToken,
} from "@/lib/auth";
import { LoginSchema } from "@/lib/validations/auth";
import { recordAudit } from "@/lib/audit-log";

export async function POST(req: Request) {
  try {
  const json = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Datos inválidos." }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      role: true,
      orgId: true,
      // Fallback: resolve org via barber → branch
      barber: { select: { branch: { select: { orgId: true } } } },
    },
  });

  if (!user) {
    return NextResponse.json(
      { message: "Credenciales incorrectas." },
      { status: 401 }
    );
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return NextResponse.json(
      { message: "Credenciales incorrectas." },
      { status: 401 }
    );
  }

  // Resolve orgId: direct → barber's branch → error
  const orgId =
    user.orgId ??
    user.barber?.branch?.orgId ??
    null;

  if (!orgId && (user.role === "ADMIN" || user.role === "BARBER")) {
    return NextResponse.json(
      { message: "Usuario sin organización asignada." },
      { status: 403 }
    );
  }

  // signSessionToken ahora también crea una Session row en DB con un
  // jti único. Esto permite invalidar el JWT server-side (logout,
  // "cerrar todas mis sesiones", cambio de password) — antes el JWT
  // robado vivía 7 días sin forma de revocarlo.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = req.headers.get("user-agent") || null;
  const token = await signSessionToken(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      orgId: orgId ?? "",
    },
    { ip, userAgent }
  );

  const res = NextResponse.json({
    message: "Login OK",
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });

  res.cookies.set(AUTH_COOKIE_NAME, token, {
    ...getCookieOptions(),
    maxAge: 60 * 60 * 24 * 7,
  });

  // Auditar el login (forense — quién entró, cuándo, desde dónde).
  await recordAudit(
    req,
    {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      orgId: orgId ?? null,
    },
    { action: "auth.login" }
  );

  return res;
  } catch (err) {
    console.error("POST /api/auth/login failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
