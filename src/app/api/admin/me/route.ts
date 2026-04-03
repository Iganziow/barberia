import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { getUserProfile } from "@/lib/services/barber.service";

export const GET = withAdmin(async (_req, { userId }) => {
  const user = await getUserProfile(userId);
  if (!user) throw AppError.notFound("Usuario no existe");
  return NextResponse.json({ user });
});
