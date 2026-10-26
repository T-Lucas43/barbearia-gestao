import { readJson } from "@/lib/http";
import { requireOrigin } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { z } from "zod";
import { createHash } from "node:crypto";
import { errorResponse, HttpError, dateSchema, rateLimit } from "@/lib/http";
import { availableSlots } from "@/lib/availability";
import { cancelBooking, rescheduleBooking } from "@/lib/booking";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const b = z
      .object({
        id: z.uuid(),
        token: z.string().regex(/^[0-9a-f]{64}$/),
        action: z.enum(["get", "cancel", "reschedule"]),
        date: dateSchema.optional(),
        hour: z.string().optional(),
      })
      .parse(await readJson(request));
    const hash = createHash("sha256").update(b.token).digest("hex");
    await rateLimit("manage:" + hash, 120, 900);
    const result = await transaction(async (c) => {
      const a = (
        await c.query(
          "SELECT a.*,p.name professional_name,COALESCE(a.service_name_snapshot,s.name) service_name,t.name shop_name,t.slug,t.cancellation_minutes,t.address FROM appointments a JOIN professionals p ON p.id=a.professional_id JOIN services s ON s.id=a.service_id JOIN tenants t ON t.id=a.tenant_id WHERE a.id=$1 AND a.manage_hash=$2 AND a.manage_expires_at>now()",
          [b.id, hash],
        )
      ).rows[0];
      if (!a)
        throw new HttpError(
          "Link inválido ou expirado. Fale com a recepção.",
          404,
        );
      if (b.action === "cancel")
        return cancelBooking(c, a.tenant_id, a.id, true);
      if (b.action === "reschedule") {
        if (!b.date || !b.hour)
          throw new HttpError("Informe nova data e horário.");
        return rescheduleBooking(c, a.tenant_id, a.id, b.date, b.hour, true);
      }
      const slots = b.date
        ? await availableSlots(
            c,
            a.tenant_id,
            b.date,
            a.professional_id,
            a.service_id,
            a.id,
            (+new Date(a.ends_at) - +new Date(a.starts_at)) / 60000,
          )
        : [];
      return {
        appointment: {
          id: a.id,
          customer: a.customer,
          professional_name: a.professional_name,
          service_name: a.service_name,
          starts_at: a.starts_at,
          ends_at: a.ends_at,
          price: a.price,
          paid: a.paid,
          status: a.status,
          shop_name: a.shop_name,
          address: a.address,
          slug: a.slug,
          cancellation_minutes: a.cancellation_minutes,
        },
        slots,
      };
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
