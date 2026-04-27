"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { formatCLP } from "@/lib/format";
import {
  googleCalendarUrl,
  downloadIcsFile,
  type CalendarEvent,
} from "@/lib/calendar-export";

type BookingDetail = {
  id: string;
  start: string;
  end: string;
  status: string;
  price: number;
  barberName: string;
  serviceName: string;
  serviceDuration: number;
  clientName: string;
  branch: {
    name: string;
    address: string | null;
    phone: string | null;
    latitude: number | null;
    longitude: number | null;
    orgName: string | null;
  };
};

// ─── Iconos ──────────────────────────────────────────────────────────
function IconCheck(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
function IconPin(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconScissors(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
    </svg>
  );
}
function IconUser(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconCalendar(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconShare(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}
function IconWhatsApp(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.126 1.524 5.867L.05 23.308a.75.75 0 00.892.892l5.441-1.474A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  );
}
function IconChev(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}
function IconInfo(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────
export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="bk bk-state">
          <p className="bk-state__p">Cargando...</p>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const { slug } = useParams<{ slug: string }>();
  const id = searchParams.get("id");
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  useEffect(() => {
    // Si no hay id, marcamos el loading como terminado al final del tick
    // (evitamos el lint react-hooks/set-state-in-effect que prohíbe setState
    // sincrónico dentro del useEffect body).
    if (!id) {
      const t = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(t);
    }
    fetch(`/api/book/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.booking) setBooking(data.booking);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const bookUrl = `/${slug}/book`;

  const calendarEvent: CalendarEvent | null = booking
    ? {
        id: booking.id,
        title: `${booking.serviceName} en ${booking.branch.orgName || booking.branch.name}`,
        description: [
          `Profesional: ${booking.barberName}`,
          `Duración: ${booking.serviceDuration} min`,
          `Total: ${formatCLP(booking.price)}`,
          booking.branch.phone ? `Teléfono: ${booking.branch.phone}` : null,
        ].filter(Boolean).join("\n"),
        location: booking.branch.address || booking.branch.name,
        start: booking.start,
        end: booking.end,
      }
    : null;

  async function handleShare() {
    if (!booking) return;
    const dateStr = new Date(booking.start).toLocaleDateString("es-CL", {
      weekday: "long", day: "numeric", month: "long",
    });
    const timeStr = new Date(booking.start).toLocaleTimeString("es-CL", {
      hour: "2-digit", minute: "2-digit",
    });
    const shareData = {
      title: `Reserva en ${booking.branch.orgName || booking.branch.name}`,
      text: `${booking.serviceName} con ${booking.barberName} — ${dateStr} a las ${timeStr}.`,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share(shareData); } catch { /* user canceled */ }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url ?? ""}`.trim());
        setShareFeedback("¡Link copiado!");
        setTimeout(() => setShareFeedback(null), 2500);
      } catch {
        setShareFeedback("No se pudo copiar.");
        setTimeout(() => setShareFeedback(null), 3000);
      }
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="bk bk-state">
        <p className="bk-state__p">Cargando reserva...</p>
      </div>
    );
  }

  // Reserva no encontrada
  if (!booking || !calendarEvent) {
    return (
      <div className="bk bk-state">
        <div className="bk-state__icon">
          <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" /><path d="M9 9l6 6M15 9l-6 6" />
          </svg>
        </div>
        <h1 className="bk-state__h">Reserva no encontrada</h1>
        <p className="bk-state__p">El link puede haber expirado o no existir.</p>
        <Link href={bookUrl} className="bk-state__cta">Volver a reservar</Link>
      </div>
    );
  }

  const startD = new Date(booking.start);
  const monthShort = startD.toLocaleDateString("es-CL", { month: "short" }).replace(".", "");
  const dayNum = startD.getDate();
  const dowShort = startD.toLocaleDateString("es-CL", { weekday: "short" }).replace(".", "");
  const timeStr = startD.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  const fullDateStr = startD.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
  const orgName = booking.branch.orgName || booking.branch.name;
  const firstName = booking.clientName.split(" ")[0];

  // Status en el subtitle: si es CANCELED u otro, ajustamos copy
  const statusEyebrow =
    booking.status === "CONFIRMED" ? "Confirmada"
    : booking.status === "CANCELED" ? "Cancelada"
    : "Reservada";

  return (
    <div className="bk bk-ok">
      {/* Hero */}
      <header className="bk-ok__hero">
        <div className="bk-ok__check">
          <IconCheck />
        </div>
        <p className="bk-ok__eyebrow">{statusEyebrow}</p>
        <h1 className="bk-ok__title">¡Listo, {firstName}!</h1>
        <p className="bk-ok__sub">
          Tu hora con <strong>{booking.barberName}</strong> está {booking.status === "CANCELED" ? "cancelada" : "reservada"} para el<br />
          <strong>{fullDateStr} a las {timeStr}</strong> en {orgName}.
        </p>
      </header>

      <div className="bk-ok__main">
        {/* Cuándo */}
        <div className="bk-ok__when-card">
          <div className="bk-ok__when-day">
            <p className="bk-ok__when-day-month">{monthShort}</p>
            <p className="bk-ok__when-day-num">{dayNum}</p>
            <p className="bk-ok__when-day-dow">{dowShort}</p>
          </div>
          <div className="bk-ok__when-info">
            <p className="bk-ok__when-time">{timeStr} hrs</p>
            <p className="bk-ok__when-pro">
              Llegada sugerida 5 min antes · {booking.serviceDuration} min
            </p>
          </div>
        </div>

        {/* Lista de info */}
        <div className="bk-ok__list">
          {booking.branch.address && (
            <div className="bk-ok__list-row">
              <IconPin />
              <div className="bk-ok__list-row-info">
                <p className="bk-ok__list-row-label">Dirección</p>
                <p className="bk-ok__list-row-value">{booking.branch.address}</p>
              </div>
              <a
                href={
                  booking.branch.latitude && booking.branch.longitude
                    ? `https://www.google.com/maps/dir/?api=1&destination=${booking.branch.latitude},${booking.branch.longitude}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.branch.address)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="bk-ok__list-pill"
              >
                Cómo llegar
              </a>
            </div>
          )}
          <div className="bk-ok__list-row">
            <IconScissors />
            <div className="bk-ok__list-row-info">
              <p className="bk-ok__list-row-label">Servicio</p>
              <p className="bk-ok__list-row-value">
                {booking.serviceName} · {formatCLP(booking.price)}
              </p>
            </div>
          </div>
          <div className="bk-ok__list-row">
            <IconUser />
            <div className="bk-ok__list-row-info">
              <p className="bk-ok__list-row-label">Profesional</p>
              <p className="bk-ok__list-row-value">{booking.barberName}</p>
            </div>
          </div>
        </div>

        {/* Mini-mapa */}
        {booking.branch.latitude && booking.branch.longitude && (
          <iframe
            title="Ubicación"
            className="bk-ok__map"
            loading="lazy"
            src={`https://maps.google.com/maps?q=${booking.branch.latitude},${booking.branch.longitude}&z=16&output=embed`}
          />
        )}

        {/* WhatsApp */}
        {booking.branch.phone && (
          <a
            href={`https://wa.me/${booking.branch.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Acabo de reservar ${booking.serviceName} para el ${fullDateStr} a las ${timeStr}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bk-ok__wa"
          >
            <span className="bk-ok__wa-icon">
              <IconWhatsApp width={18} height={18} />
            </span>
            <span className="bk-ok__wa-text">
              Contactar por WhatsApp
              <small>{booking.branch.phone}</small>
            </span>
            <IconChev className="bk-icon-sm" />
          </a>
        )}

        {/* Acciones */}
        <div className="bk-ok__actions">
          <a
            href={googleCalendarUrl(calendarEvent)}
            target="_blank"
            rel="noopener noreferrer"
            className="bk-ok__action"
          >
            <IconCalendar />
            Google Calendar
          </a>
          <button
            type="button"
            className="bk-ok__action"
            onClick={() => downloadIcsFile(calendarEvent, `reserva-${booking.id.slice(0, 8)}.ics`)}
          >
            <IconCalendar />
            Apple / Outlook
          </button>
          <button
            type="button"
            className="bk-ok__action"
            onClick={handleShare}
            style={{ gridColumn: "1 / -1" }}
          >
            <IconShare />
            {shareFeedback || "Compartir reserva"}
          </button>
        </div>

        {/* Hint */}
        <div className="bk-ok__hint">
          <IconInfo />
          <span>
            Si necesitas cancelar o cambiar tu hora, contacta directamente a la barbería.
          </span>
        </div>

        <Link href={bookUrl} className="bk-state__cta" style={{ display: "block", textAlign: "center", marginTop: 8 }}>
          Reservar otra hora
        </Link>
      </div>
    </div>
  );
}
