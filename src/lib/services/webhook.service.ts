import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Dispatch webhooks for a specific event to all active webhook URLs for the org.
 * Signs payload with HMAC-SHA256 using the webhook's secret.
 * Fire-and-forget — does not block the caller.
 */
export async function dispatchWebhook(
  orgId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const webhooks = await prisma.integrationWebhook.findMany({
    where: { orgId, event, active: true },
  });

  if (webhooks.length === 0) return;

  const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });

  await Promise.allSettled(
    webhooks.map(async (wh) => {
      const signature = createHmac("sha256", wh.secret).update(body).digest("hex");

      try {
        const res = await fetch(wh.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event,
          },
          body,
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          console.error(`Webhook ${wh.id} to ${wh.url} failed: HTTP ${res.status}`);
        }
      } catch (err) {
        console.error(`Webhook ${wh.id} to ${wh.url} error:`, err);
      }
    })
  );
}
