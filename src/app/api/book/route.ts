import { NextResponse } from "next/server";
import { withPublic } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/services/availability.service";
import { getOrgIdFromHeaders } from "@/lib/tenant";
import { stripHtml } from "@/lib/sanitize";
import { rateLimit } from "@/lib/rate-limit";
import { sendBookingConfirmation } from "@/lib/services/email.service";

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().+]/g, "").replace(/^56/, "");
}

const BookingSchema = z.object({
  serviceId: z.string().min(1),
  barberId: z.string().min(1),
  branchId: z.string().min(1),
  start: z.string().datetime(),
  end: z.string().datetime(),
  clientName: z.string().min(2).max(200).transform((s) => stripHtml(s.trim())),
  clientPhone: z
    .string()
    .min(8)
    .regex(/^\+?[\d\s\-().]+$/, "Teléfono inválido"),
  clientEmail: z.string().email().optional().or(z.literal("")),
}).refine(
  (data) => new Date(data.start) < new Date(data.end),
  { message: "La hora de inicio debe ser anterior a la hora de fin", path: ["start"] }
);

export const POST = withPublic(async (req) => {
  // Rate limit: 10 bookings per minute per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed } = rateLimit(ip, { maxRequests: 10, windowMs: 60_000 });
  if (!allowed) throw AppError.badRequest("Demasiadas solicitudes. Intenta en un minuto.");

  const json = await req.json().catch(() => null);
  const parsed = BookingSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos.", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const normalizedPhone = normalizePhone(data.clientPhone);

  // Ensure tenant context is available
  const orgId = await getOrgIdFromHeaders(req);

  // Verify service belongs to this org
  const service = await prisma.service.findFirst({
    where: { id: data.serviceId, orgId },
  });
  if (!service) {
    throw AppError.notFound("Servicio no encontrado");
  }

  // Verify barber belongs to this org and offers this service
  const barber = await prisma.barber.findFirst({
    where: { id: data.barberId, branch: { orgId } },
    include: { services: { where: { serviceId: data.serviceId } } },
  });
  if (!barber) {
    throw AppError.notFound("Barbero no encontrado");
  }
  if (barber.services.length === 0) {
    throw AppError.badRequest("Este barbero no ofrece el servicio seleccionado");
  }

  // Verify branch belongs to org
  const branch = await prisma.branch.findFirst({
    where: { id: data.branchId, orgId },
  });
  if (!branch) {
    throw AppError.notFound("Sucursal no encontrada");
  }

  // Validate slot duration matches service duration
  const slotDurationMs = new Date(data.end).getTime() - new Date(data.start).getTime();
  const slotDurationMin = Math.round(slotDurationMs / 60_000);
  if (slotDurationMin !== service.durationMin) {
    throw AppError.badRequest("La duración del horario no coincide con el servicio");
  }

  const dateStr = data.start.split("T")[0];
  const slots = await getAvailableSlots(
    data.barberId,
    dateStr,
    service.durationMin
  );

  const slotAvailable = slots.some((s) => s.start === data.start);
  if (!slotAvailable) {
    throw AppError.conflict("Este horario ya no está disponible. Intenta otro.");
  }

  // Use transaction with overlap check inside to prevent race condition
  const result = await prisma.$transaction(async (tx) => {
    // Double-check no overlapping appointment exists (prevents race condition)
    const overlapping = await tx.appointment.findFirst({
      where: {
        barberId: data.barberId,
        status: { notIn: ["CANCELED", "NO_SHOW"] },
        start: { lt: new Date(data.end) },
        end: { gt: new Date(data.start) },
      },
    });
    if (overlapping) {
      throw new Error("SLOT_TAKEN");
    }

    // Find or create client by normalized phone
    let user = await tx.user.findFirst({
      where: { phone: normalizedPhone, role: "CLIENT" },
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          name: data.clientName,
          email: data.clientEmail || `client.${Date.now()}@noemail.local`,
          phone: normalizedPhone,
          password: randomBytes(32).toString("hex"),
          role: "CLIENT",
        },
      });
    }

    let client = await tx.client.findUnique({
      where: { userId: user.id },
    });

    if (!client) {
      client = await tx.client.create({
        data: { userId: user.id },
      });
    }

    // Create appointment
    const appointment = await tx.appointment.create({
      data: {
        start: new Date(data.start),
        end: new Date(data.end),
        price: service.price,
        barberId: data.barberId,
        serviceId: data.serviceId,
        clientId: client.id,
        branchId: data.branchId,
        status: "RESERVED",
      },
      include: {
        barber: { include: { user: { select: { name: true } } } },
        service: { select: { name: true, durationMin: true } },
        client: { include: { user: { select: { name: true, email: true } } } },
        branch: { select: { name: true, address: true, orgId: true } },
      },
    });

    return appointment;
  }).catch((err: Error) => {
    if (err.message === "SLOT_TAKEN") return null;
    throw err;
  });

  if (!result) {
    throw AppError.conflict("Este horario ya no está disponible. Intenta otro.");
  }

  // Send confirmation email (fire-and-forget)
  sendBookingConfirmation(result).catch((err) => console.error("Email failed:", err));

  return NextResponse.json(
    {
      booking: {
        id: result.id,
        start: result.start.toISOString(),
        end: result.end.toISOString(),
        serviceName: result.service.name,
        serviceDuration: result.service.durationMin,
        barberName: result.barber.user.name,
        branchName: result.branch.name,
        branchAddress: result.branch.address,
        price: result.price,
        clientName: data.clientName,
      },
    },
    { status: 201 }
  );
});
