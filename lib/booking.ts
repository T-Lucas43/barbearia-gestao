import { randomBytes, createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { HttpError } from "./http";
import { checkAvailability, serviceFor } from "./availability";
import { commission } from "./domain";
import { encryptToken } from "./secure-token";
import { queueNotifications } from "./notifications";
import { audit, lockAppointment } from "./finance";
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function createBooking(
  c: PoolClient,
  tenant: string,
  b: {
    professionalId: string;
    serviceId: string;
    customer: string;
    phone: string;
    date: string;
    hour: string;
    consent: boolean;
    quotedPrice?: number;
    quotedDuration?: number;
  },
) {
  const candidates =
    b.professionalId === "any"
      ? (
          await c.query(
            "SELECT id FROM professionals WHERE tenant_id=$1 AND active ORDER BY id",
            [tenant],
          )
        ).rows.map((r) => r.id)
      : [b.professionalId];
  let chosen:
    | {
        id: string;
        service: Awaited<ReturnType<typeof serviceFor>>;
        starts: Date;
        ends: Date;
      }
    | undefined;
  for (const id of candidates) {
    try {
      const service = await serviceFor(c, tenant, id, b.serviceId);
      const slot = await checkAvailability(c, {
        tenant,
        professional: id,
        date: b.date,
        hour: b.hour,
        duration: service.actual_duration,
      });
      chosen = { id, service, ...slot };
      break;
    } catch (e) {
      if (b.professionalId !== "any" || !(e instanceof HttpError)) throw e;
    }
  }
  if (!chosen)
    throw new HttpError("Nenhum profissional disponível nesse horário.", 409);
  const { id, service, starts, ends } = chosen;
  if (
    (b.quotedPrice !== undefined && b.quotedPrice !== service.actual_price) ||
    (b.quotedDuration !== undefined &&
      b.quotedDuration !== service.actual_duration)
  )
    throw new HttpError(
      "O preço ou a duração foi atualizado. Confira o horário e o valor antes de confirmar.",
      409,
    );
  const token = randomBytes(32).toString("hex");
  const fixed = service.commission_kind === "fixed";
  if (fixed && service.commission_fixed > service.actual_price)
    throw new HttpError(
      "A comissão fixa excede o valor do serviço. Revise o cadastro.",
    );
  const a = (
    await c.query(
      "INSERT INTO appointments(tenant_id,professional_id,service_id,customer,phone,starts_at,ends_at,price,list_price,service_name_snapshot,commission_bps,commission_kind,commission_fixed,commission,consent,manage_hash,manage_cipher,manage_expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id",
      [
        tenant,
        id,
        b.serviceId,
        b.customer,
        b.phone,
        starts,
        ends,
        service.actual_price,
        service.name,
        service.actual_bps,
        service.commission_kind,
        service.commission_fixed,
        fixed
          ? service.commission_fixed
          : commission(service.actual_price, service.actual_bps),
        b.consent,
        tokenHash(token),
        encryptToken(token),
        new Date(+starts + 30 * 86400000),
      ],
    )
  ).rows[0];
  await queueNotifications(c, a.id);
  await audit(c, tenant, "book", a.id);
  return { ok: true, id: a.id, manageToken: token, professionalId: id };
}
export async function rescheduleBooking(
  c: PoolClient,
  tenant: string,
  id: string,
  date: string,
  hour: string,
  publicAction = false,
) {
  const a = await lockAppointment(c, tenant, id);
  if (!["scheduled", "confirmed"].includes(a.status))
    throw new HttpError(
      "Somente reservas agendadas ou confirmadas podem ser reagendadas.",
    );
  await checkPublicDeadline(c, a, publicAction);
  const duration = (+new Date(a.ends_at) - +new Date(a.starts_at)) / 60000;
  const { starts, ends } = await checkAvailability(c, {
    tenant,
    professional: a.professional_id,
    date,
    hour,
    duration,
    exclude: id,
  });
  await c.query(
    "UPDATE appointments SET starts_at=$1,ends_at=$2,schedule_version=schedule_version+1,status='scheduled',manage_expires_at=$3 WHERE id=$4",
    [starts, ends, new Date(+starts + 30 * 86400000), id],
  );
  await queueNotifications(c, id, "reschedule");
  await audit(c, tenant, "reschedule", id);
  return { ok: true };
}
export async function cancelBooking(
  c: PoolClient,
  tenant: string,
  id: string,
  publicAction = false,
) {
  const a = await lockAppointment(c, tenant, id);
  if (a.status === "cancelled") return { ok: true };
  if (!["scheduled", "confirmed"].includes(a.status))
    throw new HttpError("Este atendimento não pode mais ser cancelado.");
  await checkPublicDeadline(c, a, publicAction);
  await c.query(
    "UPDATE appointments SET status='cancelled',schedule_version=schedule_version+1 WHERE id=$1",
    [id],
  );
  await queueNotifications(c, id, "cancellation");
  await audit(c, tenant, "cancelled", id);
  return { ok: true };
}
async function checkPublicDeadline(
  c: PoolClient,
  a: { tenant_id: string; starts_at: string },
  enforce: boolean,
) {
  if (!enforce) return;
  const t = (
    await c.query("SELECT cancellation_minutes FROM tenants WHERE id=$1", [
      a.tenant_id,
    ])
  ).rows[0];
  if (+new Date(a.starts_at) - Date.now() < t.cancellation_minutes * 60000)
    throw new HttpError(
      `Alterações online exigem ${t.cancellation_minutes} minutos de antecedência. Fale com a recepção.`,
    );
}
