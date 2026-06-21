/**
 * Validación de URLs de webhook — mitiga SSRF.
 *
 * El endpoint de test (`/api/admin/integrations/webhooks/[id]/test`)
 * hace `fetch(wh.url)` con la URL que el admin guardó. Sin validación,
 * un admin malicioso (o uno cuya sesión está comprometida) podía apuntar
 * el webhook a:
 *   - http://localhost:5432  → escanear DB interna
 *   - http://169.254.169.254 → AWS instance metadata (creds!)
 *   - http://10.0.0.1        → equipos de red privada
 *   - file:///etc/passwd     → lectura local (algunos fetch lo aceptan)
 *
 * Reglas que enforce este validador:
 *   1. Esquema DEBE ser `https://`. http en prod es indefendible —
 *      cualquier ISP/MITM puede leer los payloads y secrets.
 *   2. Host NO puede ser una IP literal en rangos privados/loopback/link-local.
 *   3. Host NO puede ser hostname single-label (sin punto) — proxy a
 *      servicios internos como `kubernetes.default`, `redis`, etc.
 *
 * Limitación conocida: no resolvemos DNS. Un atacante podría comprar
 * un dominio público que apunte a una IP privada (DNS rebinding). Para
 * cerrar eso necesitaríamos resolver el A record y validar el resultado
 * cada vez antes del fetch — overkill para el threat model actual.
 */

const PRIVATE_IPV4_RANGES: Array<[number, number, number, number]> = [
  // [octet1Min, octet1Max, octet2Min, octet2Max] (los otros no importan)
  // 10.0.0.0/8
  [10, 10, 0, 255],
  // 172.16.0.0/12
  [172, 172, 16, 31],
  // 192.168.0.0/16
  [192, 192, 168, 168],
  // 127.0.0.0/8 — loopback
  [127, 127, 0, 255],
  // 169.254.0.0/16 — link-local (AWS metadata vive acá)
  [169, 169, 254, 254],
  // 0.0.0.0/8 — current network
  [0, 0, 0, 255],
];

function isPrivateIPv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  const octets = parts.map((p) => Number(p));
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = octets;
  return PRIVATE_IPV4_RANGES.some(
    ([a1, a2, b1, b2]) => a >= a1 && a <= a2 && b >= b1 && b <= b2
  );
}

function isPrivateIPv6(host: string): boolean {
  // Loopback (::1) y unique-local (fc00::/7, fd00::/8).
  // No es exhaustivo pero cubre los casos peligrosos comunes.
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "::1" || h === "::" ) return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true;
  if (h.startsWith("fe80")) return true; // link-local
  return false;
}

export type WebhookUrlError =
  | "invalid_url"
  | "scheme_not_https"
  | "private_host"
  | "single_label_host";

export function validateWebhookUrl(url: string): WebhookUrlError | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "invalid_url";
  }

  if (parsed.protocol !== "https:") return "scheme_not_https";

  const host = parsed.hostname.toLowerCase();

  // Hosts especiales que SIEMPRE rechazamos
  if (host === "localhost" || host === "ip6-localhost") return "private_host";
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".lan"))
    return "private_host";

  // IP literal: chequear rangos privados
  if (isPrivateIPv4(host)) return "private_host";
  if (host.includes(":") && isPrivateIPv6(host)) return "private_host";

  // Single-label sin punto (ej. "redis", "kubernetes") → casi siempre interno
  if (!host.includes(".") && !host.includes(":")) return "single_label_host";

  return null;
}

export function webhookUrlErrorMessage(err: WebhookUrlError): string {
  switch (err) {
    case "invalid_url":
      return "URL inválida";
    case "scheme_not_https":
      return "El URL debe usar https://";
    case "private_host":
      return "No se permiten URLs apuntando a hosts internos o privados";
    case "single_label_host":
      return "El host debe ser un dominio público (ej. midominio.com)";
  }
}
