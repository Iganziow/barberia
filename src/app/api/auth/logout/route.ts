import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getCookieOptions } from "@/lib/auth";

export async function POST() {
  try {
    const res = NextResponse.json({ message: "Sesión cerrada" });
    res.cookies.set(AUTH_COOKIE_NAME, "", {
      ...getCookieOptions(),
      maxAge: 0,
    });
    return res;
  } catch (err) {
    console.error("POST /api/auth/logout failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
