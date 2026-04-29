import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import AdminShell from "@/features/admin/layout/AdminShell";

/**
 * Auth gate server-side para todo /admin/*. Defense-in-depth además del
 * middleware: si el matcher del middleware tiene una grieta (ej. el bare
 * /admin sin path), este layout server-side lo cubre garantizado.
 *
 * Cualquier acceso a /admin o /admin/* sin token o con role distinto de
 * ADMIN/SUPERADMIN redirige a /login antes de servir el HTML.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?next=/admin");
  }

  try {
    const payload = await verifySessionToken(token);
    if (payload.role !== "ADMIN" && payload.role !== "SUPERADMIN") {
      redirect("/login");
    }
  } catch {
    redirect("/login?next=/admin");
  }

  return <AdminShell>{children}</AdminShell>;
}
