import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.payload.sub },
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
  } catch (err) {
    console.error("GET /api/admin/me failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
