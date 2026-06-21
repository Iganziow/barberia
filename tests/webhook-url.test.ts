import { describe, it, expect } from "vitest";
import { validateWebhookUrl } from "@/lib/webhook-url";

/**
 * Tests del validador anti-SSRF para URLs de webhooks. Si alguno falla,
 * un admin puede convertir el endpoint /test en un proxy a la red privada
 * (instance metadata, DB interna, etc.).
 */

describe("validateWebhookUrl — happy path", () => {
  it("acepta URL pública con https", () => {
    expect(validateWebhookUrl("https://api.midominio.com/hook")).toBeNull();
    expect(validateWebhookUrl("https://hooks.slack.com/abc")).toBeNull();
    expect(validateWebhookUrl("https://example.com:8443/path")).toBeNull();
  });
});

describe("validateWebhookUrl — esquema", () => {
  it("rechaza http://", () => {
    expect(validateWebhookUrl("http://midominio.com/hook")).toBe("scheme_not_https");
  });
  it("rechaza file://", () => {
    expect(validateWebhookUrl("file:///etc/passwd")).toBe("scheme_not_https");
  });
  it("rechaza ftp://", () => {
    expect(validateWebhookUrl("ftp://server.com/file")).toBe("scheme_not_https");
  });
  it("rechaza URL malformada", () => {
    expect(validateWebhookUrl("no-es-url")).toBe("invalid_url");
    expect(validateWebhookUrl("")).toBe("invalid_url");
  });
});

describe("validateWebhookUrl — hosts privados (SSRF vectors)", () => {
  it("rechaza localhost en sus variantes", () => {
    expect(validateWebhookUrl("https://localhost/hook")).toBe("private_host");
    expect(validateWebhookUrl("https://localhost:5432/db")).toBe("private_host");
  });

  it("rechaza loopback IPv4 (127.x)", () => {
    expect(validateWebhookUrl("https://127.0.0.1/")).toBe("private_host");
    expect(validateWebhookUrl("https://127.1.2.3:5432/")).toBe("private_host");
  });

  it("rechaza link-local AWS metadata (169.254.169.254)", () => {
    expect(validateWebhookUrl("https://169.254.169.254/latest/meta-data/")).toBe("private_host");
  });

  it("rechaza rango privado 10.x", () => {
    expect(validateWebhookUrl("https://10.0.0.1/")).toBe("private_host");
    expect(validateWebhookUrl("https://10.255.255.255/")).toBe("private_host");
  });

  it("rechaza rango privado 172.16-31.x", () => {
    expect(validateWebhookUrl("https://172.16.0.1/")).toBe("private_host");
    expect(validateWebhookUrl("https://172.31.0.1/")).toBe("private_host");
    // 172.32.x SÍ es pública (no en el rango privado)
    expect(validateWebhookUrl("https://172.32.0.1/")).toBeNull();
  });

  it("rechaza rango privado 192.168.x", () => {
    expect(validateWebhookUrl("https://192.168.1.1/")).toBe("private_host");
    expect(validateWebhookUrl("https://192.168.0.0/")).toBe("private_host");
  });

  it("rechaza loopback IPv6 (::1)", () => {
    expect(validateWebhookUrl("https://[::1]/")).toBe("private_host");
  });

  it("rechaza unique-local IPv6 (fc00::/7)", () => {
    expect(validateWebhookUrl("https://[fc00::1]/")).toBe("private_host");
    expect(validateWebhookUrl("https://[fd00::1]/")).toBe("private_host");
  });

  it("rechaza link-local IPv6 (fe80::/10)", () => {
    expect(validateWebhookUrl("https://[fe80::1]/")).toBe("private_host");
  });

  it("rechaza TLDs internos (.local, .internal, .lan)", () => {
    expect(validateWebhookUrl("https://servidor.local/")).toBe("private_host");
    expect(validateWebhookUrl("https://service.internal/")).toBe("private_host");
    expect(validateWebhookUrl("https://router.lan/")).toBe("private_host");
  });
});

describe("validateWebhookUrl — single-label hosts", () => {
  it("rechaza host sin punto (probable interno)", () => {
    expect(validateWebhookUrl("https://redis/")).toBe("single_label_host");
    expect(validateWebhookUrl("https://kubernetes/")).toBe("single_label_host");
  });
});

describe("validateWebhookUrl — defensa contra typos no-evidentes", () => {
  it("rechaza http aunque tenga puerto https-like", () => {
    expect(validateWebhookUrl("http://midominio.com:443/")).toBe("scheme_not_https");
  });
  it("rechaza host con mayúsculas que matcheen rangos privados", () => {
    expect(validateWebhookUrl("https://LOCALHOST/")).toBe("private_host");
  });
});
