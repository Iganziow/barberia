import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import {
  bookingConfirmationHtml,
  appointmentReminderHtml,
  statusChangeHtml,
} from "@/lib/email-templates";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function isRealEmail(email: string | null | undefined): email is string {
  return !!email && !email.endsWith("@noemail.local") && !email.endsWith("@placeholder.local");
}

type FullAppointment = {
  id: string;
  start: Date;
  end: Date;
  price: number;
  service: { name: string };
  barber: { user: { name: string } };
  client: { user: { name: string; email: string | null } };
  branch: { name: string; address: string | null; orgId: string };
};

async function getOrgInfo(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, logo: true, phone: true, email: true },
  });
}

async function logNotification(
  appointmentId: string,
  event: "APPOINTMENT_CREATED" | "APPOINTMENT_REMINDER" | "APPOINTMENT_CANCELED" | "APPOINTMENT_CONFIRMED",
  recipient: string,
  error?: string
) {
  await prisma.notification.create({
    data: {
      type: "EMAIL",
      event,
      recipient,
      appointmentId,
      sentAt: error ? null : new Date(),
      error: error ?? null,
    },
  }).catch(() => {}); // Don't break if logging fails
}

/**
 * Send booking confirmation email.
 * Fire-and-forget — does not block the booking flow.
 */
export async function sendBookingConfirmation(appointment: FullAppointment): Promise<void> {
  if (!resend) return;

  const email = appointment.client.user.email;
  if (!isRealEmail(email)) return;

  const org = await getOrgInfo(appointment.branch.orgId);
  if (!org) return;

  const html = bookingConfirmationHtml(
    org,
    {
      serviceName: appointment.service.name,
      barberName: appointment.barber.user.name,
      start: appointment.start,
      end: appointment.end,
      price: appointment.price,
      branchAddress: appointment.branch.address,
    },
    appointment.client.user.name
  );

  try {
    await resend.emails.send({
      from: `${org.name} <onboarding@resend.dev>`,
      to: email,
      subject: `Reserva confirmada — ${appointment.service.name}`,
      html,
    });
    await logNotification(appointment.id, "APPOINTMENT_CREATED", email);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Email send failed:", msg);
    await logNotification(appointment.id, "APPOINTMENT_CREATED", email, msg);
  }
}

/**
 * Send status change email (CONFIRMED or CANCELED).
 */
export async function sendStatusChangeEmail(appointmentId: string, newStatus: string): Promise<void> {
  if (!resend) return;
  if (newStatus !== "CONFIRMED" && newStatus !== "CANCELED") return;

  const apt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      service: { select: { name: true } },
      barber: { include: { user: { select: { name: true } } } },
      client: { include: { user: { select: { name: true, email: true } } } },
      branch: { select: { name: true, address: true, orgId: true } },
    },
  });

  if (!apt) return;

  const email = apt.client.user.email;
  if (!isRealEmail(email)) return;

  const org = await getOrgInfo(apt.branch.orgId);
  if (!org) return;

  const html = statusChangeHtml(
    org,
    {
      serviceName: apt.service.name,
      barberName: apt.barber.user.name,
      start: apt.start,
      end: apt.end,
      price: apt.price,
      branchAddress: apt.branch.address,
    },
    apt.client.user.name,
    newStatus
  );

  const event = newStatus === "CANCELED" ? "APPOINTMENT_CANCELED" as const : "APPOINTMENT_CONFIRMED" as const;

  try {
    await resend.emails.send({
      from: `${org.name} <onboarding@resend.dev>`,
      to: email,
      subject: newStatus === "CANCELED"
        ? `Cita cancelada — ${org.name}`
        : `Cita confirmada — ${org.name}`,
      html,
    });
    await logNotification(apt.id, event, email);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Email send failed:", msg);
    await logNotification(apt.id, event, email, msg);
  }
}

/**
 * Send reminders for tomorrow's appointments.
 * Returns count of emails sent.
 */
export async function sendReminders(orgId: string): Promise<number> {
  if (!resend) return 0;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  // Get tomorrow's appointments that haven't received a reminder
  const appointments = await prisma.appointment.findMany({
    where: {
      branch: { orgId },
      start: { gte: startOfDay, lt: endOfDay },
      status: { in: ["RESERVED", "CONFIRMED"] },
      notifications: {
        none: { event: "APPOINTMENT_REMINDER", type: "EMAIL" },
      },
    },
    include: {
      service: { select: { name: true } },
      barber: { include: { user: { select: { name: true } } } },
      client: { include: { user: { select: { name: true, email: true } } } },
      branch: { select: { name: true, address: true, orgId: true } },
    },
  });

  const org = await getOrgInfo(orgId);
  if (!org) return 0;

  let sent = 0;

  for (const apt of appointments) {
    const email = apt.client.user.email;
    if (!isRealEmail(email)) continue;

    const html = appointmentReminderHtml(
      org,
      {
        serviceName: apt.service.name,
        barberName: apt.barber.user.name,
        start: apt.start,
        end: apt.end,
        price: apt.price,
        branchAddress: apt.branch.address,
      },
      apt.client.user.name
    );

    try {
      await resend.emails.send({
        from: `${org.name} <onboarding@resend.dev>`,
        to: email,
        subject: `Recordatorio: tu cita es mañana — ${org.name}`,
        html,
      });
      await logNotification(apt.id, "APPOINTMENT_REMINDER", email);
      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await logNotification(apt.id, "APPOINTMENT_REMINDER", email, msg);
    }
  }

  return sent;
}
