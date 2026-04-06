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
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function baseLayout(org: OrgInfo, content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf8f6;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:500px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <div style="text-align:center;padding:24px 0 16px;">
    ${org.logo ? `<img src="${org.logo}" alt="${org.name}" style="max-height:60px;border-radius:12px;margin-bottom:12px;" />` : ""}
    <h1 style="margin:0;font-size:22px;color:#1a1412;">
      ${org.name}
    </h1>
  </div>

  <!-- Content -->
  <div style="background:white;border-radius:12px;border:1px solid #e8e2dc;padding:24px;margin-bottom:16px;">
    ${content}
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:16px 0;font-size:12px;color:#a8a29e;">
    ${org.phone ? `<p style="margin:4px 0;">Tel: ${org.phone}</p>` : ""}
    ${org.email ? `<p style="margin:4px 0;">${org.email}</p>` : ""}
    <p style="margin:8px 0 0;">&copy; ${new Date().getFullYear()} ${org.name}</p>
  </div>

</div>
</body>
</html>`;
}

export function bookingConfirmationHtml(org: OrgInfo, apt: AppointmentInfo, clientName: string): string {
  const content = `
    <h2 style="margin:0 0 16px;font-size:18px;color:#1a1412;">Reserva confirmada</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#57534e;">
      Hola <strong>${clientName}</strong>, tu hora ha sido reservada.
    </p>

    <div style="background:#faf8f6;border-radius:8px;padding:16px;margin-bottom:16px;">
      <table style="width:100%;font-size:14px;color:#1a1412;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#78716c;">Servicio</td><td style="padding:6px 0;text-align:right;font-weight:600;">${apt.serviceName}</td></tr>
        <tr><td style="padding:6px 0;color:#78716c;">Profesional</td><td style="padding:6px 0;text-align:right;font-weight:600;">${apt.barberName}</td></tr>
        <tr><td style="padding:6px 0;color:#78716c;">Fecha</td><td style="padding:6px 0;text-align:right;font-weight:600;">${formatDate(apt.start)}</td></tr>
        <tr><td style="padding:6px 0;color:#78716c;">Hora</td><td style="padding:6px 0;text-align:right;font-weight:600;">${formatTime(apt.start)} - ${formatTime(apt.end)}</td></tr>
        <tr style="border-top:1px solid #e8e2dc;"><td style="padding:10px 0 0;color:#78716c;">Precio</td><td style="padding:10px 0 0;text-align:right;font-weight:700;color:#c87941;font-size:16px;">${formatCLP(apt.price)}</td></tr>
      </table>
    </div>

    ${apt.branchAddress ? `<p style="margin:0 0 8px;font-size:13px;color:#78716c;">&#x1F4CD; ${apt.branchAddress}</p>` : ""}
    <p style="margin:16px 0 0;font-size:12px;color:#a8a29e;">
      Si necesitas cancelar o cambiar tu hora, contacta directamente a ${org.name}.
    </p>`;

  return baseLayout(org, content);
}

export function appointmentReminderHtml(org: OrgInfo, apt: AppointmentInfo, clientName: string): string {
  const content = `
    <h2 style="margin:0 0 16px;font-size:18px;color:#1a1412;">Recordatorio de tu cita</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#57534e;">
      Hola <strong>${clientName}</strong>, te recordamos que tienes una cita programada.
    </p>

    <div style="background:#faf8f6;border-radius:8px;padding:16px;margin-bottom:16px;">
      <table style="width:100%;font-size:14px;color:#1a1412;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#78716c;">Servicio</td><td style="padding:6px 0;text-align:right;font-weight:600;">${apt.serviceName}</td></tr>
        <tr><td style="padding:6px 0;color:#78716c;">Profesional</td><td style="padding:6px 0;text-align:right;font-weight:600;">${apt.barberName}</td></tr>
        <tr><td style="padding:6px 0;color:#78716c;">Fecha</td><td style="padding:6px 0;text-align:right;font-weight:600;">${formatDate(apt.start)}</td></tr>
        <tr><td style="padding:6px 0;color:#78716c;">Hora</td><td style="padding:6px 0;text-align:right;font-weight:600;">${formatTime(apt.start)} - ${formatTime(apt.end)}</td></tr>
      </table>
    </div>

    ${apt.branchAddress ? `<p style="margin:0 0 8px;font-size:13px;color:#78716c;">&#x1F4CD; ${apt.branchAddress}</p>` : ""}
    <p style="margin:16px 0 0;font-size:12px;color:#a8a29e;">Te esperamos puntual.</p>`;

  return baseLayout(org, content);
}

export function statusChangeHtml(org: OrgInfo, apt: AppointmentInfo, clientName: string, newStatus: string): string {
  const isCancel = newStatus === "CANCELED";
  const title = isCancel ? "Cita cancelada" : "Cita confirmada";
  const message = isCancel
    ? `tu cita del <strong>${formatDate(apt.start)}</strong> a las <strong>${formatTime(apt.start)}</strong> ha sido cancelada.`
    : `tu cita del <strong>${formatDate(apt.start)}</strong> a las <strong>${formatTime(apt.start)}</strong> ha sido confirmada.`;

  const content = `
    <h2 style="margin:0 0 16px;font-size:18px;color:${isCancel ? "#EF4444" : "#10B981"};">${title}</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#57534e;">
      Hola <strong>${clientName}</strong>, ${message}
    </p>

    <div style="background:#faf8f6;border-radius:8px;padding:16px;margin-bottom:16px;">
      <table style="width:100%;font-size:14px;color:#1a1412;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#78716c;">Servicio</td><td style="padding:6px 0;text-align:right;font-weight:600;">${apt.serviceName}</td></tr>
        <tr><td style="padding:6px 0;color:#78716c;">Profesional</td><td style="padding:6px 0;text-align:right;font-weight:600;">${apt.barberName}</td></tr>
      </table>
    </div>

    <p style="margin:16px 0 0;font-size:12px;color:#a8a29e;">
      ${isCancel ? `Si deseas reagendar, visita la página de ${org.name}.` : `Te esperamos. Si necesitas cambiar la hora, contacta a ${org.name}.`}
    </p>`;

  return baseLayout(org, content);
}
