import type { NextConfig } from "next";
import path from "path";

/**
 * Security headers aplicados a TODAS las respuestas. Endurecen el
 * navegador contra XSS / clickjacking / MITM / privacy leaks.
 *
 *  - HSTS: forza HTTPS por 1 año (incluye subdomains, preload-ready)
 *  - X-Frame-Options: DENY → no nos pueden embeber en iframes (clickjacking)
 *  - X-Content-Type-Options: nosniff → el browser no adivina MIME types
 *  - Referrer-Policy: strict-origin-when-cross-origin → no leakear paths internos
 *  - Permissions-Policy: cierra cámara/mic/geo (no usamos)
 *  - X-DNS-Prefetch-Control: off → privacy
 *  - CSP: política estricta — solo cargamos scripts/styles/imgs de
 *    fuentes que controlamos. unsafe-inline/eval son necesarios para
 *    Next.js dev pero los relajamos solo en development.
 *
 * Si en el futuro agregamos analytics/Sentry/etc, hay que listar sus
 * dominios en script-src/connect-src.
 */
const isDev = process.env.NODE_ENV !== "production";

const cspDirectives = [
  "default-src 'self'",
  // Next.js requiere unsafe-inline+eval en dev (HMR + fast refresh).
  // En prod usamos unsafe-inline (estilos dinámicos) y eval-less.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Imágenes: own + dataURIs + cualquier https (logos de orgs vienen de URLs externos).
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com data:",
  // Connect: own API + Resend (email transaccional, opcional)
  "connect-src 'self' https://api.resend.com",
  // Frames: solo nosotros (Google Maps embed se sirve via iframe → permitirlo)
  "frame-src 'self' https://maps.google.com https://*.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Content-Security-Policy", value: cspDirectives },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Fija la raíz de trazado al directorio del proyecto.
  outputFileTracingRoot: path.resolve(__dirname),

  async headers() {
    return [
      {
        // Aplica a TODAS las rutas
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
