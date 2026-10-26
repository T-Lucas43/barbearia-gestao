import { db } from "./db";
import type { PoolClient } from "pg";
import { HttpError } from "./http";
export function subscriptionState(
  s: { status: string; period_end: string | Date | null } | null,
  now = Date.now(),
) {
  if (!s) return "pending";
  return s.status === "active" &&
    (!s.period_end || +new Date(s.period_end) <= now)
    ? "expired"
    : s.status;
}
export async function subscriptionFor(
  tenant: string,
  client: Pick<PoolClient, "query"> = db,
) {
  const row = (
    await client.query(
      "SELECT t.billing_enforced,s.*,p.name plan_name FROM tenants t LEFT JOIN subscriptions s ON s.tenant_id=t.id LEFT JOIN plans p ON p.id=s.plan_id WHERE t.id=$1",
      [tenant],
    )
  ).rows[0];
  return row
    ? {
        ...row,
        state: row.billing_enforced ? subscriptionState(row) : "legacy",
      }
    : null;
}
export async function assertSubscription(
  tenant: string,
  client: Pick<PoolClient, "query"> = db,
  publicBooking = false,
) {
  const s = await subscriptionFor(tenant, client);
  if (!s) throw new HttpError("Barbearia não encontrada.", 404);
  if (s.billing_enforced && s.state !== "active")
    throw new HttpError(
      publicBooking
        ? "Esta barbearia não está recebendo novos agendamentos. Entre em contato com a equipe."
        : "A assinatura precisa de ativação ou renovação. Consulte Plano e assinatura. Seus dados continuam disponíveis para consulta e exportação.",
      403,
    );
  return s;
}
export async function assertProfessionalCapacity(
  client: PoolClient,
  tenant: string,
  excludeId?: string,
) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
    "subscription:" + tenant,
  ]);
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
    "professionals:" + tenant,
  ]);
  const s = await assertSubscription(tenant, client);
  if (!s.billing_enforced) return;
  const count = Number(
    (
      await client.query(
        "SELECT count(*) count FROM professionals WHERE tenant_id=$1 AND active AND ($2::text IS NULL OR id<>$2)",
        [tenant, excludeId || null],
      )
    ).rows[0].count,
  );
  if (count >= s.professional_limit)
    throw new HttpError(
      "O limite de profissionais ativos do plano foi atingido. Solicite outro plano ou desative um profissional.",
      409,
    );
}
