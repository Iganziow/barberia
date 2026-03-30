import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME,
  getCookieOptions,
  signSessionToken,
} from "@/lib/auth";
import { LoginSchema } from "@/lib/validations/auth";

export async function POST(req: Request) {
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

  const token = await signSessionToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    orgId: orgId ?? "",
  });

  const res = NextResponse.json({
    message: "Login OK",
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });

  res.cookies.set(AUTH_COOKIE_NAME, token, {
    ...getCookieOptions(),
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
