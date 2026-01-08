import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME,
  getCookieOptions,
  signSessionToken,
} from "@/lib/auth";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Datos inválidos." }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, password: true, role: true },
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

  const token = await signSessionToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
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
