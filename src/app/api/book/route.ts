import { NextResponse } from "next/server";
import { withPublic } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { z } from "zod";
import { randomBytes, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  validateAppointmentSlot,
  slotConflictMessage,
  acquireBarberLock,
} from "@/lib/services/availability.service";
import { invalidateAvailability } from "@/lib/cache/availability-cache";
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
  // Mensaje opcional que el cliente deja al reservar — el equipo lo ve en el
  // detalle de la cita ("vengo apurado", "alérgico a X", "rápido por favor").
  // Sanitizamos HTML y limitamos a 500 chars para evitar abuso.
  notePublic: z
    .string()
    .max(500)
    .transform((s) => stripHtml(s.trim()))
    .optional()
    .or(z.literal("")),
}).refine(
  (data) => new Date(data.start) < new Date(data.end),
  { message: "La hora de inicio debe ser anterior a la hora de fin", path: ["start"] }
).refine(
  (data) => {
    // Bloquea reservas a más de 60 días en el futuro. Defense-in-depth
    // contra clientes que mandan POST directo bypaseando la UI.
    const maxFuture = new Date();
    maxFuture.setDate(maxFuture.getDate() + 60);
    return new Date(data.start) <= maxFuture;
  },
  { message: "Solo se pueden reservar fechas dentro de los próximos 60 días", path: ["start"] }
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

  // Verify barber belongs to this org and offers this service. Traemos
  // BarberService con customDuration/customPrice para respetar overrides
  // del barbero (ej: Daniel cobra $15k por "Corte" cuando el base es $10k).
  // Antes el booking público los ignoraba → discrepancia de cobranza.
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
  const barberService = barber.services[0];
  const effectiveDuration = barberService.customDuration ?? service.durationMin;
  const effectivePrice = barberService.customPrice ?? service.price;

  // Verify branch belongs to org
  const branch = await prisma.branch.findFirst({
    where: { id: data.branchId, orgId },
  });
  if (!branch) {
    throw AppError.notFound("Sucursal no encontrada");
  }

  // Validate slot duration matches the EFFECTIVE service duration (custom
  // del barbero si existe, sino la base). Antes comparaba contra
  // service.durationMin lo que rompía si el barbero tenía custom.
  const slotDurationMs = new Date(data.end).getTime() - new Date(data.start).getTime();
  const slotDurationMin = Math.round(slotDurationMs / 60_000);
  if (slotDurationMin !== effectiveDuration) {
    throw AppError.badRequest("La duración del horario no coincide con el servicio");
  }

  // Validación atómica del slot DENTRO de la transacción: schedule del
  // barbero + horario de sucursal + overlap con citas + overlap con
  // bloqueos. Reemplaza el check parcial anterior que solo miraba
  // appointment overlap (un block creado entre el getAvailableSlots y
  // el commit no se detectaba).
  const result = await prisma.$transaction(async (tx) => {
    // Lock advisory por barbero — serializa cualquier intento concurrente
    // de reservar con el mismo barbero. Sin esto, 3 POSTs simultáneos al
    // mismo slot pasaban los 3 el overlap check (cada transacción veía
    // la DB pre-commit) → se creaban 3 citas duplicadas (race condition
    // crítica detectada en e2e).
    await acquireBarberLock(tx as unknown as typeof prisma, data.barberId);

    const conflict = await validateAppointmentSlot(
      tx as unknown as typeof prisma,
      {
        barberId: data.barberId,
        branchId: data.branchId,
        start: new Date(data.start),
        end: new Date(data.end),
      },
      { rejectPast: true }
    );
    if (conflict) {
      throw new Error(`SLOT_INVALID:${slotConflictMessage(conflict)}`);
    }

    // Find or create client by normalized phone
    let user = await tx.user.findFirst({
      where: { phone: normalizedPhone, role: "CLIENT" },
    });

    if (!user) {
      // Email sintético cuando el cliente no provee email — necesario
      // porque User.email es UNIQUE en el schema. Antes usábamos
      // `Date.now()` lo que podía colisionar si dos clientes se
      // registraban en el mismo milisegundo (raro pero posible bajo
      // carga). UUID v4 elimina esa posibilidad por completo.
      user = await tx.user.create({
        data: {
          name: data.clientName,
          email: data.clientEmail || `client.${randomUUID()}@noemail.local`,
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

    // Create appointment con el precio EFECTIVO (custom del barbero si
    // existe, sino el base). Antes guardaba siempre service.price.
    const appointment = await tx.appointment.create({
      data: {
        start: new Date(data.start),
        end: new Date(data.end),
        price: effectivePrice,
        barberId: data.barberId,
        serviceId: data.serviceId,
        clientId: client.id,
        branchId: data.branchId,
        status: "RESERVED",
        // Si el cliente dejó un mensaje, persistirlo (notePublic). Lo
        // ven el barbero y el admin en el detalle de la cita.
        notePublic: data.notePublic ? data.notePublic : null,
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
    if (err.message.startsWith("SLOT_INVALID:")) {
      // Devolvemos null + mensaje específico (extraído del error) para
      // que el cliente sepa exactamente qué falló.
      const message = err.message.slice("SLOT_INVALID:".length);
      throw AppError.conflict(message || "Este horario ya no está disponible. Intenta otro.");
    }
    throw err;
  });

  if (!result) {
    throw AppError.conflict("Este horario ya no está disponible. Intenta otro.");
  }

  // Invalida el caché de availability — el nuevo slot ocupado debe verse
  // inmediatamente en `/api/book/availability` (no esperar TTL de 30s).
  // Tageamos por barbero (filtra para getAvailableSlots) y por sucursal
  // (filtra para getBarbersWithAvailability + heatmap).
  invalidateAvailability({ barberId: data.barberId, branchId: data.branchId });

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
