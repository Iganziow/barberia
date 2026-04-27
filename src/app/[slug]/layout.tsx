import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

/**
 * Layout server-side para las páginas públicas del negocio.
 * Su único propósito es generar `<head>` con metadata OG/Twitter para
 * que cuando alguien comparte el link en WhatsApp/Instagram/etc se vea
 * la previsualización con nombre + descripción + logo del negocio.
 *
 * El page.tsx es client component, así que generateMetadata vive acá.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { name: true, description: true, logo: true },
  });

  if (!org) {
    return {
      title: "Negocio no encontrado",
      robots: { index: false, follow: false },
    };
  }

  const title = `Reserva tu hora — ${org.name}`;
  const description =
    org.description ||
    `Reserva tu cita en ${org.name} de forma fácil y rápida. Elige tu servicio, profesional y horario.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: org.name,
      ...(org.logo ? { images: [{ url: org.logo, alt: org.name }] } : {}),
    },
    twitter: {
      card: org.logo ? "summary_large_image" : "summary",
      title,
      description,
      ...(org.logo ? { images: [org.logo] } : {}),
    },
  };
}

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
