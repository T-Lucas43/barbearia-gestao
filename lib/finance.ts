import type { PoolClient } from "pg";
import { HttpError } from "./http";
import type { Session } from "./auth";
export async function audit(
  c: PoolClient,
  tenant: string,
  action: string,
  id: string,
) {
  await c.query(
    "INSERT INTO audit_log(tenant_id,action,entity_id) VALUES ($1,$2,$3)",
    [tenant, action, id],
  );
}
export async function lockAppointment(
  c: PoolClient,
  tenant: string,
  id: string,
) {
  const initial = (
    await c.query(
      "SELECT professional_id FROM appointments WHERE id=$1 AND tenant_id=$2",
      [id, tenant],
    )
  ).rows[0];
  if (!initial) throw new HttpError("Atendimento não encontrado.", 404);
  await c.query(
    "SELECT id FROM professionals WHERE id=$1 AND tenant_id=$2 FOR UPDATE",
    [initial.professional_id, tenant],
  );
  return (
    await c.query(
      "SELECT * FROM appointments WHERE id=$1 AND tenant_id=$2 FOR UPDATE",
      [id, tenant],
    )
  ).rows[0];
}
export async function cashMovement(
  c: PoolClient,
  tenant: string,
  method: string,
  amount: number,
  kind: string,
  reference: string,
) {
  if (method !== "Dinheiro" || amount === 0) return;
  const cash = (
    await c.query(
      "SELECT id,opening FROM cash_sessions WHERE tenant_id=$1 AND closed_at IS NULL FOR UPDATE",
      [tenant],
    )
  ).rows[0];
  if (!cash)
    throw new HttpError(
      "Abra o caixa antes de registrar uma movimentação em dinheiro.",
    );
  if (amount < 0) {
    const total = (
      await c.query(
        "SELECT COALESCE(sum(amount),0)::int n FROM cash_movements WHERE session_id=$1",
        [cash.id],
      )
    ).rows[0].n;
    if (cash.opening + total + amount < 0)
      throw new HttpError(
        "Saldo insuficiente no caixa físico para esta saída.",
      );
  }
  await c.query(
    "INSERT INTO cash_movements(tenant_id,session_id,amount,kind,reference_id) VALUES ($1,$2,$3,$4,$5)",
    [tenant, cash.id, amount, kind, reference],
  );
}
export async function receipt(
  c: PoolClient,
  s: Session,
  id: string,
  input: { amount: number; tip: number; fee: number; method: string },
) {
  const a = await lockAppointment(c, s.tenant_id, id);
  if (s.role === "barber" && a.professional_id !== s.professional_id)
    throw new HttpError("Sem permissão.", 403);
  if (["cancelled", "no_show"].includes(a.status))
    throw new HttpError(
      "Atendimento cancelado ou encerrado sem comparecimento.",
    );
  if (input.amount > a.price - a.paid)
    throw new HttpError("Valor maior que o saldo pendente.");
  if (input.amount + input.tip <= 0 || input.fee > input.amount + input.tip)
    throw new HttpError("Confira o valor recebido e a taxa.");
  if (input.method !== "Cartão" && input.fee > 0)
    throw new HttpError(
      "Taxa de cartão só pode ser aplicada a pagamentos em cartão.",
    );
  const p = (
    await c.query(
      "INSERT INTO payments(tenant_id,appointment_id,kind,service_amount,tip,fee,method,created_by) VALUES ($1,$2,'receipt',$3,$4,$5,$6,$7) RETURNING id",
      [
        s.tenant_id,
        id,
        input.amount,
        input.tip,
        input.fee,
        input.method,
        s.user_id,
      ],
    )
  ).rows[0];
  await c.query(
    "UPDATE appointments SET paid=paid+$1,payment_method=$2 WHERE id=$3",
    [input.amount, input.method, id],
  );
  await cashMovement(
    c,
    s.tenant_id,
    input.method,
    input.amount + input.tip,
    "receipt",
    p.id,
  );
  await audit(c, s.tenant_id, "receipt", p.id);
  return p;
}
export async function refund(
  c: PoolClient,
  s: Session,
  paymentId: string,
  input: { amount: number; tip: number; fee: number; reason: string },
) {
  const original = (
    await c.query(
      "SELECT * FROM payments WHERE id=$1 AND tenant_id=$2 AND kind='receipt'",
      [paymentId, s.tenant_id],
    )
  ).rows[0];
  if (!original) throw new HttpError("Recebimento não encontrado.", 404);
  await lockAppointment(c, s.tenant_id, original.appointment_id);
  const totals = (
    await c.query(
      "SELECT COALESCE(sum(service_amount),0)::int amount,COALESCE(sum(tip),0)::int tip,COALESCE(sum(fee),0)::int fee FROM payments WHERE original_id=$1 AND kind='refund'",
      [paymentId],
    )
  ).rows[0];
  if (
    input.amount + totals.amount > original.service_amount ||
    input.tip + totals.tip > original.tip ||
    input.fee + totals.fee > original.fee ||
    input.amount + input.tip === 0
  )
    throw new HttpError(
      "O estorno excede o valor disponível no recebimento original.",
    );
  const p = (
    await c.query(
      "INSERT INTO payments(tenant_id,appointment_id,kind,service_amount,tip,fee,method,original_id,reason,created_by) VALUES ($1,$2,'refund',$3,$4,$5,$6,$7,$8,$9) RETURNING id",
      [
        s.tenant_id,
        original.appointment_id,
        input.amount,
        input.tip,
        input.fee,
        original.method,
        original.id,
        input.reason,
        s.user_id,
      ],
    )
  ).rows[0];
  await c.query("UPDATE appointments SET paid=paid-$1 WHERE id=$2", [
    input.amount,
    original.appointment_id,
  ]);
  await cashMovement(
    c,
    s.tenant_id,
    original.method,
    -input.amount - input.tip,
    "refund",
    p.id,
  );
  await audit(c, s.tenant_id, "refund", p.id);
  return p;
}
export async function balances(
  c: PoolClient,
  tenant: string,
  pid: string | null = null,
) {
  return (
    await c.query(
      `WITH payment_totals AS (SELECT appointment_id,sum(CASE WHEN kind='receipt' THEN tip ELSE -tip END)::int tips FROM payments WHERE tenant_id=$1 GROUP BY appointment_id), commissions AS (SELECT professional_id,COALESCE(sum(CASE WHEN status='completed' THEN a.price ELSE 0 END),0)::int service_total,COALESCE(sum(CASE WHEN status='completed' THEN a.paid ELSE 0 END),0)::int service_received,COALESCE(sum(CASE WHEN status='completed' THEN commission ELSE 0 END),0)::int generated,COALESCE(sum(CASE WHEN status='completed' AND price>0 THEN round(commission::numeric*paid/price) ELSE 0 END),0)::int released,COALESCE(sum(CASE WHEN status='completed' THEN COALESCE(pt.tips,0) ELSE 0 END),0)::int tips FROM appointments a LEFT JOIN payment_totals pt ON pt.appointment_id=a.id WHERE a.tenant_id=$1 GROUP BY professional_id) SELECT p.id professional_id,COALESCE(c.service_total,0)::int service_total,COALESCE(c.service_received,0)::int service_received,COALESCE(c.generated,0) generated,COALESCE(c.released,0) released,COALESCE(c.tips,0) tips,COALESCE((SELECT sum(amount) FROM payouts WHERE tenant_id=$1 AND professional_id=p.id),0)::int paid,COALESCE((SELECT sum(amount) FROM advances WHERE tenant_id=$1 AND professional_id=p.id),0)::int advances FROM professionals p LEFT JOIN commissions c ON c.professional_id=p.id WHERE p.tenant_id=$1 AND ($2::text IS NULL OR p.id=$2) ORDER BY p.name`,
      [tenant, pid],
    )
  ).rows.map((r) => ({
    ...r,
    available: r.released + r.tips - r.paid - r.advances,
    earned: r.generated,
    shop_generated: r.service_total - r.generated,
    shop_released: r.service_received - r.released,
  }));
}
export async function financialReport(
  c: PoolClient,
  tenant: string,
  start: string,
  end: string,
  pid: string | null = null,
) {
  const sums = (
    await c.query(
      `SELECT COALESCE(sum(CASE WHEN kind='receipt' THEN service_amount ELSE -service_amount END),0)::int received,COALESCE(sum(CASE WHEN kind='receipt' THEN tip ELSE -tip END),0)::int tips,COALESCE(sum(CASE WHEN kind='receipt' THEN fee ELSE -fee END),0)::int fees FROM payments p JOIN appointments a ON a.id=p.appointment_id WHERE p.tenant_id=$1 AND p.created_at>=($2::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND p.created_at<($3::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND ($4::text IS NULL OR a.professional_id=$4)`,
      [tenant, start, end, pid],
    )
  ).rows[0];
  const releaseAt = async (bound: string) =>
    (
      await c.query(
        `WITH totals AS (SELECT appointment_id, sum(CASE WHEN kind='receipt' THEN service_amount ELSE -service_amount END) amount,sum(CASE WHEN kind='receipt' THEN tip ELSE -tip END) tips FROM payments WHERE tenant_id=$1 AND created_at<($2::date::timestamp AT TIME ZONE 'America/Sao_Paulo') GROUP BY appointment_id) SELECT COALESCE(sum(COALESCE(t.amount,0)),0)::int service,COALESCE(sum(CASE WHEN a.price>0 THEN round(a.commission::numeric*COALESCE(t.amount,0)/a.price) ELSE 0 END),0)::int commission,COALESCE(sum(COALESCE(t.tips,0)),0)::int tips FROM appointments a LEFT JOIN totals t ON t.appointment_id=a.id WHERE a.tenant_id=$1 AND a.status='completed' AND a.completed_at<($2::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND ($3::text IS NULL OR a.professional_id=$3)`,
        [tenant, bound, pid],
      )
    ).rows[0];
  const [begin, finish, expense] = await Promise.all([
    releaseAt(start),
    releaseAt(end),
    c.query(
      "SELECT COALESCE(sum(amount),0)::int n FROM expenses WHERE tenant_id=$1 AND paid_at>=($2::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND paid_at<($3::date::timestamp AT TIME ZONE 'America/Sao_Paulo')",
      [tenant, start, end],
    ),
  ]);
  const commissions = finish.commission - begin.commission;
  const tipsReleased = finish.tips - begin.tips;
  return {
    ...sums,
    commissions,
    shopShare: finish.service - begin.service - commissions,
    tipsReleased,
    expenses: pid ? 0 : expense.rows[0].n,
    result: pid
      ? null
      : sums.received +
        sums.tips -
        commissions -
        tipsReleased -
        sums.fees -
        expense.rows[0].n,
  };
}
