import { formatCLP } from "@/lib/format";

type OrgInfo = {
  name: string;
  logo: string | null;
  phone: string | null;
  email: string | null;
};

type AppointmentInfo = {
  serviceName: string;
  barberName: string;
  start: Date;
  end: Date;
  price: number;
  branchAddress: string | null;
  branchLat?: number | null;
  branchLng?: number | null;
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function mapsLink(address: string | null, lat?: number | null, lng?: number | null): string | null {
  if (lat && lng) return `https://maps.google.com/maps?q=${lat},${lng}`;
  if (address) return `https://maps.google.com/maps?q=${encodeURIComponent(address)}`;
  return null;
}

function whatsappLink(phone: string | null): string | null {
  if (!phone) return null;
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

function baseLayout(org: OrgInfo, content: string, accentColor = "#c87941"): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:20px 12px;">

  <!-- Brand bar -->
  <div style="height:4px;background:${accentColor};border-radius:4px 4px 0 0;"></div>

  <!-- Card -->
  <div style="background:#ffffff;border:1px solid #e8e2dc;border-top:none;border-radius:0 0 16px 16px;overflow:hidden;">

    <!-- Header -->
    <div style="padding:28px 28px 0;text-align:center;">
      ${org.logo
        ? `<img src="${org.logo}" alt="${org.name}" style="max-height:48px;border-radius:8px;margin-bottom:8px;" />`
        : `<div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:#1a1412;color:#c87941;font-weight:900;font-size:18px;line-height:48px;text-align:center;margin-bottom:8px;">${org.name.charAt(0)}</div>`
      }
      <h1 style="margin:0;font-size:20px;color:#1a1412;font-weight:800;letter-spacing:-0.3px;">
        ${org.name}
      </h1>
    </div>

    <!-- Content -->
    <div style="padding:24px 28px 28px;">
      ${content}
    </div>

  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:20px 0 8px;">
    ${org.phone ? `<a href="${whatsappLink(org.phone)}" style="display:inline-block;margin:0 6px;padding:8px 16px;background:#25D366;color:white;font-size:12px;font-weight:600;text-decoration:none;border-radius:20px;">WhatsApp</a>` : ""}
    ${org.email ? `<a href="mailto:${org.email}" style="display:inline-block;margin:0 6px;padding:8px 16px;background:#e8e2dc;color:#57534e;font-size:12px;font-weight:600;text-decoration:none;border-radius:20px;">Email</a>` : ""}
    <p style="margin:12px 0 0;font-size:11px;color:#a8a29e;">&copy; ${new Date().getFullYear()} ${org.name}</p>
  </div>

</div>
</body>
</html>`;
}

export function bookingConfirmationHtml(org: OrgInfo, apt: AppointmentInfo, clientName: string): string {
  const mapUrl = mapsLink(apt.branchAddress, apt.branchLat, apt.branchLng);

  const content = `
    <!-- Status icon -->
    <div style="text-align:center;margin-bottom:20px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#f0fdf4;line-height:56px;text-align:center;font-size:28px;">&#x2713;</div>
    </div>

    <h2 style="margin:0 0 8px;font-size:20px;color:#1a1412;text-align:center;font-weight:700;">Reserva confirmada</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#78716c;text-align:center;">
      Hola <strong style="color:#1a1412;">${clientName}</strong>, tu hora ha sido reservada.
    </p>

    <!-- Date highlight -->
    <div style="background:#1a1412;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:12px;color:#a8a29e;text-transform:uppercase;letter-spacing:1px;">Fecha y hora</p>
      <p style="margin:0;font-size:18px;color:#ffffff;font-weight:700;">${formatDate(apt.start)}</p>
      <p style="margin:4px 0 0;font-size:24px;color:#c87941;font-weight:800;">${formatTime(apt.start)} - ${formatTime(apt.end)}</p>
    </div>

    <!-- Details -->
    <div style="background:#faf8f6;border-radius:10px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;font-size:14px;color:#1a1412;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#78716c;vertical-align:top;">Servicio</td>
          <td style="padding:8px 0;text-align:right;font-weight:600;">${apt.serviceName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#78716c;border-top:1px solid #e8e2dc;">Profesional</td>
          <td style="padding:8px 0;text-align:right;font-weight:600;border-top:1px solid #e8e2dc;">${apt.barberName}</td>
        </tr>
        <tr>
          <td style="padding:10px 0 0;color:#78716c;border-top:1px solid #e8e2dc;">Total</td>
          <td style="padding:10px 0 0;text-align:right;font-weight:800;color:#c87941;font-size:18px;border-top:1px solid #e8e2dc;">${formatCLP(apt.price)}</td>
        </tr>
      </table>
    </div>

    <!-- Location -->
    ${apt.branchAddress ? `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;">
      <div style="flex-shrink:0;width:32px;height:32px;border-radius:8px;background:#faf8f6;text-align:center;line-height:32px;font-size:16px;">&#x1F4CD;</div>
      <div>
        <p style="margin:0;font-size:13px;color:#1a1412;font-weight:500;">${apt.branchAddress}</p>
        ${mapUrl ? `<a href="${mapUrl}" style="font-size:12px;color:#c87941;text-decoration:none;">Ver en Google Maps &rarr;</a>` : ""}
      </div>
    </div>` : ""}

    <p style="margin:0;font-size:12px;color:#a8a29e;text-align:center;">
      Si necesitas cancelar o cambiar tu hora, contacta directamente a ${org.name}.
    </p>`;

  return baseLayout(org, content, "#10B981");
}

export function appointmentReminderHtml(org: OrgInfo, apt: AppointmentInfo, clientName: string): string {
  const mapUrl = mapsLink(apt.branchAddress, apt.branchLat, apt.branchLng);

  const content = `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#FEF3C7;line-height:56px;text-align:center;font-size:28px;">&#x1F514;</div>
    </div>

    <h2 style="margin:0 0 8px;font-size:20px;color:#1a1412;text-align:center;font-weight:700;">Recordatorio</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#78716c;text-align:center;">
      <strong style="color:#1a1412;">${clientName}</strong>, tu cita es ma&ntilde;ana.
    </p>

    <div style="background:#1a1412;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:12px;color:#a8a29e;text-transform:uppercase;letter-spacing:1px;">Ma&ntilde;ana</p>
      <p style="margin:0;font-size:18px;color:#ffffff;font-weight:700;">${formatDate(apt.start)}</p>
      <p style="margin:4px 0 0;font-size:24px;color:#c87941;font-weight:800;">${formatTime(apt.start)} - ${formatTime(apt.end)}</p>
    </div>

    <div style="background:#faf8f6;border-radius:10px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;font-size:14px;color:#1a1412;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#78716c;">Servicio</td><td style="padding:8px 0;text-align:right;font-weight:600;">${apt.serviceName}</td></tr>
        <tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e8e2dc;">Profesional</td><td style="padding:8px 0;text-align:right;font-weight:600;border-top:1px solid #e8e2dc;">${apt.barberName}</td></tr>
      </table>
    </div>

    ${apt.branchAddress ? `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
      <div style="flex-shrink:0;width:32px;height:32px;border-radius:8px;background:#faf8f6;text-align:center;line-height:32px;font-size:16px;">&#x1F4CD;</div>
      <div>
        <p style="margin:0;font-size:13px;color:#1a1412;font-weight:500;">${apt.branchAddress}</p>
        ${mapUrl ? `<a href="${mapUrl}" style="font-size:12px;color:#c87941;text-decoration:none;">Ver en Google Maps &rarr;</a>` : ""}
      </div>
    </div>` : ""}

    <p style="margin:0;font-size:12px;color:#a8a29e;text-align:center;">Te esperamos puntual.</p>`;

  return baseLayout(org, content, "#F59E0B");
}

export function statusChangeHtml(org: OrgInfo, apt: AppointmentInfo, clientName: string, newStatus: string): string {
  const isCancel = newStatus === "CANCELED";
  const icon = isCancel ? "&#x2717;" : "&#x2713;";
  const iconBg = isCancel ? "#FEF2F2" : "#F0FDF4";
  const titleColor = isCancel ? "#EF4444" : "#10B981";
  const title = isCancel ? "Cita cancelada" : "Cita confirmada";
  const accentColor = isCancel ? "#EF4444" : "#10B981";

  const message = isCancel
    ? `tu cita del <strong style="color:#1a1412;">${formatDate(apt.start)}</strong> a las <strong style="color:#1a1412;">${formatTime(apt.start)}</strong> ha sido cancelada.`
    : `tu cita del <strong style="color:#1a1412;">${formatDate(apt.start)}</strong> a las <strong style="color:#1a1412;">${formatTime(apt.start)}</strong> ha sido confirmada.`;

  const content = `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:${iconBg};line-height:56px;text-align:center;font-size:28px;color:${titleColor};">${icon}</div>
    </div>

    <h2 style="margin:0 0 8px;font-size:20px;color:${titleColor};text-align:center;font-weight:700;">${title}</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#78716c;text-align:center;">
      Hola <strong style="color:#1a1412;">${clientName}</strong>, ${message}
    </p>

    <div style="background:#faf8f6;border-radius:10px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;font-size:14px;color:#1a1412;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#78716c;">Servicio</td><td style="padding:8px 0;text-align:right;font-weight:600;">${apt.serviceName}</td></tr>
        <tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e8e2dc;">Profesional</td><td style="padding:8px 0;text-align:right;font-weight:600;border-top:1px solid #e8e2dc;">${apt.barberName}</td></tr>
        ${!isCancel ? `<tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e8e2dc;">Hora</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#c87941;border-top:1px solid #e8e2dc;">${formatTime(apt.start)} - ${formatTime(apt.end)}</td></tr>` : ""}
      </table>
    </div>

    <p style="margin:0;font-size:12px;color:#a8a29e;text-align:center;">
      ${isCancel ? `Si deseas reagendar, contacta a ${org.name}.` : `Te esperamos. Si necesitas cambiar la hora, contacta a ${org.name}.`}
    </p>`;

  return baseLayout(org, content, accentColor);
}
