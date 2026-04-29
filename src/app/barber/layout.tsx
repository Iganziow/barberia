import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

/**
 * Auth gate server-side para todo /barber/*. Defense-in-depth.
 * Si no hay token o el role no es BARBER, redirige a /login antes
 * de servir el HTML (el middleware también lo hace pero acá lo
 * garantizamos sin depender del matcher).
 */
export default async function BarberLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?next=/barber");
  }

  try {
    const payload = await verifySessionToken(token);
    if (payload.role !== "BARBER") {
      redirect("/login");
    }
  } catch {
    redirect("/login?next=/barber");
  }

  return <>{children}</>;
}
