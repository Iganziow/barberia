import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { withAdmin } from "@/lib/api-handler";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { validateWebhookUrl, webhookUrlErrorMessage } from "@/lib/webhook-url";

/**
 * POST /api/admin/integrations/webhooks/[id]/test
 *
 * Envía un payload de prueba al URL del webhook y devuelve el resultado
 * (status code, latencia, primera línea del body de respuesta). No
 * persiste ningún log — es solo para validar interactivamente que la
 * URL está viva antes de esperar un evento real.
 *
 * El payload simula un appointment.completed con data ficticia. Va
 * firmado con HMAC-SHA256 igual que los eventos reales, así el cliente
 * puede verificar su lógica de verificación.
 */
export const POST = withAdmin(async (_req, { orgId }, { params }) => {
  const { id } = await params;

  const wh = await prisma.integrationWebhook.findFirst({
    where: { id, orgId },
  });
  if (!wh) throw AppError.notFound("Webhook no encontrado");

  // Revalidación defense-in-depth: aunque el POST de creación ya valida,
  // un webhook creado ANTES de la validación (datos legacy) podría tener
  // un URL malicioso persistido. Revalidamos antes de cada test fetch.
  const urlError = validateWebhookUrl(wh.url);
  if (urlError) {
    throw AppError.badRequest(webhookUrlErrorMessage(urlError));
  }

  const body = JSON.stringify({
    event: wh.event,
    timestamp: new Date().toISOString(),
    test: true,
    data: {
      appointmentId: "test_appointment_id",
      serviceName: "Corte de prueba",
      barberName: "Barbero de prueba",
      price: 10000,
    },
  });

  const signature = createHmac("sha256", wh.secret).update(body).digest("hex");

  const startedAt = Date.now();
  let status = 0;
  let ok = false;
  let responseSnippet: string | null = null;
  let errorMessage: string | null = null;

  try {
    const res = await fetch(wh.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": wh.event,
        "X-Webhook-Test": "true",
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    status = res.status;
    ok = res.ok;
    const text = await res.text().catch(() => "");
    responseSnippet = text.slice(0, 200);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Error de red";
  }

  const latencyMs = Date.now() - startedAt;

  return NextResponse.json({
    ok,
    status,
    latencyMs,
    responseSnippet,
    error: errorMessage,
  });
});
