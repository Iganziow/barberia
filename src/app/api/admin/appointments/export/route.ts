import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { getAppointments } from "@/lib/services/appointment.service";
import { parseDate } from "@/lib/sanitize";

function escapeCSV(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function icsDate(d: Date): string {
  // YYYYMMDDTHHMMSSZ (UTC, obligatorio para iCal portable)
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

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/**
 * GET /api/admin/appointments/export?format=csv|ics&from=...&to=...&branchId=...&barberId=...
 */
export const GET = withAdmin(async (req, { orgId }) => {
  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") || "csv").toLowerCase();
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const from = fromStr ? parseDate(fromStr) : undefined;
  const to = toStr ? parseDate(toStr) : undefined;

  if ((fromStr && !from) || (toStr && !to)) {
    throw AppError.badRequest("Formato de fecha inválido");
  }

  const appointments = await getAppointments({
    orgId,
    branchId: searchParams.get("branchId") || undefined,
    barberId: searchParams.get("barberId") || undefined,
    from: from ?? undefined,
    to: to ?? undefined,
  });

  if (format === "ics" || format === "ical") {
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MarBrava//Agenda//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];
    for (const a of appointments) {
      if (a.status === "CANCELED" || a.status === "NO_SHOW") continue;
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${a.id}@marbrava`);
      lines.push(`DTSTAMP:${icsDate(new Date())}`);
      lines.push(`DTSTART:${icsDate(a.start)}`);
      lines.push(`DTEND:${icsDate(a.end)}`);
      lines.push(
        `SUMMARY:${icsEscape(`${a.client.user.name} — ${a.service.name}`)}`
      );
      lines.push(
        `DESCRIPTION:${icsEscape(
          `Profesional: ${a.barber.user.name}\nEstado: ${a.status}`
        )}`
      );
      lines.push(`STATUS:${a.status === "DONE" ? "CONFIRMED" : "TENTATIVE"}`);
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    const body = lines.join("\r\n");
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="agenda-${new Date()
          .toISOString()
          .slice(0, 10)}.ics"`,
      },
    });
  }

  // CSV (default)
  const header = [
    "Fecha",
    "Hora inicio",
    "Hora fin",
    "Cliente",
    "Teléfono",
    "Servicio",
    "Profesional",
    "Estado",
    "Precio",
  ];
  const rows: string[] = [header.map(escapeCSV).join(",")];
  for (const a of appointments) {
    const d = a.start;
    const endD = a.end;
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const startStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const endStr = `${pad(endD.getHours())}:${pad(endD.getMinutes())}`;
    rows.push(
      [
        dateStr,
        startStr,
        endStr,
        a.client.user.name,
        a.client.user.phone ?? "",
        a.service.name,
        a.barber.user.name,
        a.status,
        a.price,
      ]
        .map(escapeCSV)
        .join(",")
    );
  }
  const csv = "\uFEFF" + rows.join("\r\n"); // BOM para Excel reconocer UTF-8
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="agenda-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
});
