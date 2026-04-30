import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PWAInstall from "@/components/ui/PWAInstall";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MarBrava — Reserva tu hora",
  description: "Sistema de reservas para barberías. Agenda online, gestión de equipo y reportes.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MarBrava",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1412",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/**
 * Script inline que aplica el tema (light/dark) ANTES del primer paint
 * para evitar el "flash de tema incorrecto" (FOUC).
 *
 * Lee localStorage["mb_theme"]:
 *   - "dark" / "light" → fuerza ese tema
 *   - "system" o ausente → sigue prefers-color-scheme del SO
 *
 * Aplica el resultado como `data-theme="dark"` o `data-theme="light"` en
 * <html>, y setea `color-scheme` para que el navegador adapte form
 * controls / scrollbars nativos.
 */
const themeInitScript = `
(function(){try{
  var s=localStorage.getItem('mb_theme');
  var d=(s==='dark')||((s===null||s==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);
  var t=d?'dark':'light';
  document.documentElement.dataset.theme=t;
  document.documentElement.style.colorScheme=t;
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          {children}
        </ToastProvider>
        <PWAInstall />
      </body>
    </html>
  );
}
