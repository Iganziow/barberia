import { describe, it, expect } from "vitest";
import { validateImageUrl } from "@/lib/image-url";

/**
 * Tests del validador de URL de foto de barbero. Más permisivo que el de
 * webhooks (no bloquea IPs privadas — una foto interna no es un vector de
 * SSRF, solo se renderiza en un <img>), pero exige https.
 */

describe("validateImageUrl — válidas", () => {
  it("acepta https con o sin extensión", () => {
    expect(validateImageUrl("https://cdn.com/foto.jpg")).toBeNull();
    expect(validateImageUrl("https://res.cloudinary.com/demo/image/upload/v1/sample")).toBeNull();
    expect(validateImageUrl("https://i.imgur.com/abc123")).toBeNull();
    expect(validateImageUrl("https://lh3.googleusercontent.com/a/photo=s400")).toBeNull();
  });
});

describe("validateImageUrl — rechazos", () => {
  it("rechaza http (mixed content)", () => {
    expect(validateImageUrl("http://cdn.com/foto.jpg")).toBe("not_https");
  });
  it("rechaza data: y otros esquemas", () => {
    expect(validateImageUrl("data:image/png;base64,iVBORw0KGgo=")).toBe("not_https");
    expect(validateImageUrl("ftp://server/foto.jpg")).toBe("not_https");
  });
  it("rechaza URL malformada", () => {
    expect(validateImageUrl("no-es-url")).toBe("invalid_url");
    expect(validateImageUrl("")).toBe("invalid_url");
  });
  it("rechaza URL absurdamente larga (>2000)", () => {
    const long = "https://cdn.com/" + "a".repeat(2001);
    expect(validateImageUrl(long)).toBe("too_long");
  });
});
