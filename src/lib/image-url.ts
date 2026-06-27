/**
 * Validación de URLs de imagen (foto de perfil del barbero).
 *
 * No descargamos ni re-hosteamos la imagen — guardamos el link tal cual
 * en `User.avatar` y lo renderizamos en un <img>. Por eso validamos que:
 *   1. Sea https (http es inseguro y muchos navegadores bloquean
 *      mixed-content al cargar imgs http en una página https).
 *   2. Sea una URL parseable.
 *   3. No sea absurdamente larga (límite defensivo para la columna).
 *
 * NO validamos la extensión (.jpg/.png): muchos CDN sirven imágenes desde
 * URLs sin extensión (ej. Cloudinary, Gravatar, Unsplash). Si el link no
 * apunta a una imagen real, el <img> simplemente no carga y cae al
 * fallback de iniciales — no es un problema de seguridad.
 */

const MAX_URL_LENGTH = 2000;

export type ImageUrlError = "invalid_url" | "not_https" | "too_long";

export function validateImageUrl(url: string): ImageUrlError | null {
  if (url.length > MAX_URL_LENGTH) return "too_long";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "invalid_url";
  }
  if (parsed.protocol !== "https:") return "not_https";
  return null;
}

export function imageUrlErrorMessage(err: ImageUrlError): string {
  switch (err) {
    case "invalid_url":
      return "URL de imagen inválida";
    case "not_https":
      return "La URL de la foto debe usar https://";
    case "too_long":
      return "La URL es demasiado larga";
  }
}
