import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import SuperAdminShell from "@/features/superadmin/SuperAdminShell";

/**
 * Auth gate server-side para todo /superadmin/*. Solo SUPERADMIN.
 */
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?next=/superadmin");
  }

  try {
    const payload = await verifySessionToken(token);
    if (payload.role !== "SUPERADMIN") {
      redirect("/login");
    }
  } catch {
    redirect("/login?next=/superadmin");
  }

  return <SuperAdminShell>{children}</SuperAdminShell>;
}
