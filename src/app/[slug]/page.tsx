import { redirect } from "next/navigation";

/**
 * Antes esta página era el "landing" del negocio (hero + servicios +
 * profesionales + QR + mapa). Pero con el nuevo layout Express del flujo
 * de reserva — donde TODO cabe en una sola pantalla — la landing
 * quedaba como un paso intermedio de fricción que duplicaba la lista
 * de servicios. El cliente venía desde WhatsApp/Instagram, ya sabía a
 * qué barbería iba, y solo quería reservar.
 *
 * Ahora `/[slug]` redirige directamente a `/[slug]/book`. URL canónica
 * única. El layout.tsx server-side mantiene la metadata OG/Twitter para
 * que la previsualización al compartir el link siga funcionando.
 *
 * Si el slug no existe, el booking page ya muestra una pantalla 404
 * amigable propia.
 */
export default async function OrgIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/${slug}/book`);
}
