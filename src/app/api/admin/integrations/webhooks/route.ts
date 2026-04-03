import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/sanitize";

const VALID_EVENTS = [
  "appointment.completed",
  "appointment.canceled",
  "appointment.created",
];

export const GET = withAdmin(async (_req, { orgId }) => {
  const webhooks = await prisma.integrationWebhook.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    webhooks: webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      event: w.event,
      active: w.active,
      createdAt: w.createdAt.toISOString(),
    })),
  });
});

export const POST = withAdmin(async (req, { orgId }) => {
  const body = await req.json().catch(() => null);

  if (!body?.url || !body?.event) {
    throw AppError.badRequest("url y event son requeridos");
  }

  if (!VALID_EVENTS.includes(body.event)) {
    throw AppError.badRequest(`Evento inválido. Válidos: ${VALID_EVENTS.join(", ")}`);
  }

  try {
    new URL(body.url);
  } catch {
    throw AppError.badRequest("URL inválida");
  }

  const secret = randomBytes(32).toString("hex");

  const webhook = await prisma.integrationWebhook.create({
    data: {
      url: stripHtml(body.url),
      event: body.event,
      secret,
      orgId,
    },
  });

  return NextResponse.json({
    webhook: {
      id: webhook.id,
      url: webhook.url,
      event: webhook.event,
      secret,
    },
    message: "Guarda el secret — se usa para verificar la firma de los webhooks.",
  }, { status: 201 });
});
