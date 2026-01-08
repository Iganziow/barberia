import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  let payload;
  try {
    payload = await verifySessionToken(token);
  } catch {
    return NextResponse.json({ message: "Sesión inválida" }, { status: 401 });
  }

  if (payload.role !== "ADMIN") {
    return NextResponse.json({ message: "Prohibido" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: "Usuario no existe" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
