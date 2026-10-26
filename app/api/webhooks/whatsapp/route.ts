import { createHash } from "node:crypto";
import { z } from "zod";
import { transaction } from "@/lib/db";
import { verifyWebhook } from "@/lib/whatsapp";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!expected)
    return Response.json(
      { error: "Webhook não configurado." },
      { status: 503 },
    );
  if (
    p.get("hub.mode") !== "subscribe" ||
    p.get("hub.verify_token") !== expected
  )
    return Response.json({ error: "Verificação inválida." }, { status: 403 });
  return new Response(p.get("hub.challenge") || "", {
    headers: { "Content-Type": "text/plain" },
  });
}
const statusSchema = z.object({
  id: z.string(),
  status: z.enum(["sent", "delivered", "read", "failed"]),
  timestamp: z.string().optional(),
  biz_opaque_callback_data: z.uuid().optional(),
});
const payloadSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(
    z.object({
      changes: z.array(
        z.object({
          value: z.object({
            metadata: z.object({ phone_number_id: z.string() }).optional(),
            statuses: z.array(z.unknown()).optional(),
          }),
        }),
      ),
    }),
  ),
});
export async function POST(request: Request) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret)
    return Response.json(
      { error: "Webhook não configurado." },
      { status: 503 },
    );
  const raw = await request.text();
  if (raw.length > 1024 * 1024)
    return Response.json({ error: "Payload muito grande." }, { status: 413 });
  if (!verifyWebhook(raw, request.headers.get("x-hub-signature-256"), secret))
    return Response.json({ error: "Assinatura inválida." }, { status: 403 });
  let parsed;
  try {
    parsed = payloadSchema.parse(JSON.parse(raw));
  } catch {
    return Response.json({ error: "Payload inválido." }, { status: 400 });
  }
  await transaction(async (c) => {
    for (const entry of parsed.entry)
      for (const change of entry.changes) {
        if (
          process.env.WHATSAPP_PHONE_NUMBER_ID &&
          change.value.metadata?.phone_number_id !==
            process.env.WHATSAPP_PHONE_NUMBER_ID
        )
          continue;
        for (const input of change.value.statuses || []) {
          const result = statusSchema.safeParse(input);
          if (!result.success) continue;
          const s = result.data;
          const event = createHash("sha256")
            .update(s.id + ":" + s.status + ":" + (s.timestamp || ""))
            .digest("hex");
          if (
            !(
              await c.query(
                "INSERT INTO webhook_events(id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id",
                [event],
              )
            ).rowCount
          )
            continue;
          const notification = (
            await c.query(
              "SELECT id,status FROM notifications WHERE provider_message_id=$1 OR ($2::uuid IS NOT NULL AND id=$2::uuid) FOR UPDATE",
              [s.id, s.biz_opaque_callback_data || null],
            )
          ).rows[0];
          if (!notification) continue;
          const rank: Record<string, number> = {
            sent: 1,
            delivered: 2,
            read: 3,
          };
          if (
            ["delivered", "read"].includes(notification.status) &&
            s.status === "failed"
          )
            continue;
          if (
            s.status !== "failed" &&
            (rank[notification.status] || 0) > (rank[s.status] || 0)
          )
            continue;
          await c.query(
            "UPDATE notifications SET status=$1,provider_message_id=COALESCE(provider_message_id,$2),delivered_at=CASE WHEN $1 IN ('delivered','read') THEN COALESCE(delivered_at,now()) ELSE delivered_at END,updated_at=now() WHERE id=$3",
            [s.status, s.id, notification.id],
          );
        }
      }
  });
  return Response.json({ ok: true });
}
