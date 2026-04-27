/**
 * Generadores de URLs y archivos para "agregar al calendario".
 *
 * - `googleCalendarUrl`: link directo que abre el modal de Google Calendar.
 * - `icsContent`: archivo .ics estándar (RFC 5545) compatible con Apple
 *   Calendar, Outlook, y prácticamente cualquier app de calendario.
 *
 * Las fechas en .ics y Google se serializan como UTC con sufijo Z para
 * evitar ambigüedad de timezone.
 */

export type CalendarEvent = {
  /** Identificador único — usado en el UID del .ics. */
  id: string;
  /** Título del evento (ej "Corte de pelo en Barbería X"). */
  title: string;
  /** Descripción larga (opcional). */
  description?: string;
  /** Ubicación textual (opcional). */
  location?: string;
  /** ISO 8601 — start. */
  start: string;
  /** ISO 8601 — end. */
  end: string;
};

/** Convierte ISO → "YYYYMMDDTHHMMSSZ" (formato compacto de Google/iCal). */
function toCompactUtc(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

/**
 * URL de "Agregar a Google Calendar". Abre el modal de creación con todos
 * los campos prellenados — el usuario solo confirma.
 */
export function googleCalendarUrl(ev: CalendarEvent): string {
  const base = "https://calendar.google.com/calendar/render";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${toCompactUtc(ev.start)}/${toCompactUtc(ev.end)}`,
    ...(ev.description ? { details: ev.description } : {}),
    ...(ev.location ? { location: ev.location } : {}),
  });
  return `${base}?${params.toString()}`;
}

/**
 * Escape para campos de texto en .ics — RFC 5545: comas, semicolons,
 * backslashes y newlines van escapados.
 */
function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Contenido .ics RFC 5545 — guardado como text/calendar. Una sola
 * línea por property (no aplicamos line folding porque para una cita
 * normal no superamos los 75 chars y los clientes lo aceptan igual).
 */
export function icsContent(ev: CalendarEvent, domain = "barber-booking.app"): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${domain}//Booking//ES`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.id}@${domain}`,
    `DTSTAMP:${toCompactUtc(new Date().toISOString())}`,
    `DTSTART:${toCompactUtc(ev.start)}`,
    `DTEND:${toCompactUtc(ev.end)}`,
    `SUMMARY:${escapeIcs(ev.title)}`,
    ...(ev.description ? [`DESCRIPTION:${escapeIcs(ev.description)}`] : []),
    ...(ev.location ? [`LOCATION:${escapeIcs(ev.location)}`] : []),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // RFC 5545 obliga CRLF como separador de líneas.
  return lines.join("\r\n");
}

/**
 * Helper de browser: dispara la descarga de un .ics. Solo funciona en
 * cliente porque usa Blob + createObjectURL.
 */
export function downloadIcsFile(ev: CalendarEvent, filename = "reserva.ics") {
  if (typeof window === "undefined") return;
  const blob = new Blob([icsContent(ev)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
