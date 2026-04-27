import { describe, it, expect } from "vitest";
import {
  googleCalendarUrl,
  icsContent,
  type CalendarEvent,
} from "@/lib/calendar-export";

const sampleEvent: CalendarEvent = {
  id: "abc-123",
  title: "Corte de pelo en Barbería MarBrava",
  description: "Profesional: Juan\nDuración: 30 min",
  location: "Av. Providencia 1234, Santiago",
  start: "2026-05-15T14:30:00.000Z",
  end: "2026-05-15T15:00:00.000Z",
};

describe("googleCalendarUrl", () => {
  it("includes all event details in query params", () => {
    const url = googleCalendarUrl(sampleEvent);
    expect(url).toContain("calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    // URLSearchParams usa + para espacios y %XX para chars especiales (form encoding).
    expect(url).toContain("Corte+de+pelo+en+Barber%C3%ADa+MarBrava");
    // Las / en el rango van como %2F porque URLSearchParams las escapa.
    expect(url).toContain("20260515T143000Z%2F20260515T150000Z");
    expect(url).toContain("Av.+Providencia+1234%2C+Santiago");
  });

  it("works without optional fields", () => {
    const minimal: CalendarEvent = {
      id: "id",
      title: "Cita",
      start: "2026-05-15T14:30:00.000Z",
      end: "2026-05-15T15:00:00.000Z",
    };
    const url = googleCalendarUrl(minimal);
    expect(url).toContain("text=Cita");
    expect(url).not.toContain("location=");
    expect(url).not.toContain("details=");
  });
});

describe("icsContent", () => {
  it("produces valid VCALENDAR structure", () => {
    const ics = icsContent(sampleEvent);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("VERSION:2.0");
  });

  it("includes UID with the event id", () => {
    const ics = icsContent(sampleEvent);
    expect(ics).toContain("UID:abc-123@");
  });

  it("formats DTSTART/DTEND in compact UTC", () => {
    const ics = icsContent(sampleEvent);
    expect(ics).toContain("DTSTART:20260515T143000Z");
    expect(ics).toContain("DTEND:20260515T150000Z");
  });

  it("escapes special chars in summary/description", () => {
    const ev: CalendarEvent = {
      id: "x",
      title: "Hi, friend; backslash \\",
      description: "line1\nline2",
      start: sampleEvent.start,
      end: sampleEvent.end,
    };
    const ics = icsContent(ev);
    expect(ics).toContain("SUMMARY:Hi\\, friend\\; backslash \\\\");
    expect(ics).toContain("DESCRIPTION:line1\\nline2");
  });

  it("uses CRLF line endings (RFC 5545)", () => {
    const ics = icsContent(sampleEvent);
    expect(ics).toContain("\r\n");
    // No bare \n entre líneas (excepto los \\n escapados de la descripción).
    const parts = ics.split("\r\n");
    expect(parts.length).toBeGreaterThan(8);
  });
});
