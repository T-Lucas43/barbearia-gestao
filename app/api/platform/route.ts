import { readJson } from "@/lib/http";
import { requireOrigin } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/platform";
import { db, transaction } from "@/lib/db";
import { errorResponse, HttpError, amountSchema, rateLimit } from "@/lib/http";
import { z } from "zod";
const privateHeaders = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const user = await requirePlatformAdmin();
    const [plans, tenants, requests, audit] = await Promise.all([
      db.query("SELECT * FROM plans ORDER BY name"),
      db.query(
        "SELECT t.id,t.name,t.slug,t.billing_enforced,s.plan_id,s.status,s.period_end,s.professional_limit,s.price_snapshot,p.name plan_name,(SELECT count(*) FROM professionals pr WHERE pr.tenant_id=t.id AND pr.active) professional_count FROM tenants t LEFT JOIN subscriptions s ON s.tenant_id=t.id LEFT JOIN plans p ON p.id=s.plan_id ORDER BY t.name LIMIT 500",
      ),
      db.query(
        "SELECT r.*,p.name plan_name,t.name tenant_name FROM subscription_requests r JOIN tenants t ON t.id=r.tenant_id JOIN plans p ON p.id=r.plan_id WHERE r.status='pending' ORDER BY r.created_at",
      ),
      db.query(
        "SELECT a.action,a.entity_id,a.created_at,u.name actor_name FROM platform_audit a JOIN auth_user u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 50",
      ),
    ]);
    return Response.json(
      {
        name: user.name,
        plans: plans.rows,
        tenants: tenants.rows,
        requests: requests.rows,
        audit: audit.rows,
        manualBilling: true,
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const user = await requirePlatformAdmin();
    await rateLimit("platform:" + user.id, 120, 60);
    const raw = await readJson(request);
    await transaction(async (c) => {
      if (raw.action === "plan") {
        const d = z
          .object({
            action: z.literal("plan"),
            id: z.string().regex(/^[a-z][a-z0-9-]{1,59}$/),
            name: z.string().trim().min(2).max(80),
            description: z.string().trim().max(300),
            monthlyPrice: amountSchema.nullable(),
            maxProfessionals: z.number().int().min(1).max(1000).nullable(),
            published: z.boolean(),
            active: z.boolean(),
          })
          .strict()
          .parse(raw);
        if (
          d.published &&
          (d.monthlyPrice === null || d.maxProfessionals === null)
        )
          throw new HttpError(
            "Defina preço e limite antes de publicar o plano.",
          );
        await c.query(
          "INSERT INTO plans(id,name,description,monthly_price,max_professionals,published,active) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,monthly_price=excluded.monthly_price,max_professionals=excluded.max_professionals,published=excluded.published,active=excluded.active,updated_at=now()",
          [
            d.id,
            d.name,
            d.description,
            d.monthlyPrice,
            d.maxProfessionals,
            d.published,
            d.active,
          ],
        );
        await c.query(
          "INSERT INTO platform_audit(actor_id,action,entity_id) VALUES($1,$2,$3)",
          [user.id, "plan_update", d.id],
        );
        return;
      }
      if (raw.action === "receipt") {
        const d = z
          .object({
            action: z.literal("receipt"),
            tenantId: z.string().min(1).max(100),
            planId: z.string().min(1).max(60),
            amount: amountSchema,
            method: z.enum(["Pix", "Transferência", "Dinheiro", "Cortesia"]),
            reference: z.string().trim().min(3).max(160),
            periodEnd: z.iso.datetime({ offset: true }),
            confirmed: z.literal(true),
            idempotencyKey: z.uuid(),
          })
          .strict()
          .parse(raw);
        if (
          +new Date(d.periodEnd) <= Date.now() ||
          +new Date(d.periodEnd) > Date.now() + 397 * 86400000
        )
          throw new HttpError("Informe um vencimento futuro, em até 397 dias.");
        if ((d.amount === 0) !== (d.method === "Cortesia"))
          throw new HttpError(
            "Use Cortesia somente para uma ativação sem recebimento.",
          );
        await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          "subscription:" + d.tenantId,
        ]);
        const old = (
          await c.query(
            "SELECT tenant_id,plan_id,amount,method,reference,period_end,recorded_by FROM subscription_receipts WHERE idempotency_key=$1",
            [d.idempotencyKey],
          )
        ).rows[0];
        if (old) {
          if (
            old.tenant_id !== d.tenantId ||
            old.plan_id !== d.planId ||
            old.amount !== d.amount ||
            old.method !== d.method ||
            old.reference !== d.reference ||
            +new Date(old.period_end) !== +new Date(d.periodEnd) ||
            old.recorded_by !== user.id
          )
            throw new HttpError(
              "A chave já foi usada para outro recebimento.",
              409,
            );
          return;
        }
        const tenant = (
          await c.query(
            "SELECT id FROM tenants WHERE id=$1 AND id<>'demo' FOR UPDATE",
            [d.tenantId],
          )
        ).rows[0];
        if (!tenant)
          throw new HttpError(
            "Barbearia não encontrada ou de demonstração.",
            404,
          );
        const p = (
          await c.query(
            "SELECT * FROM plans WHERE id=$1 AND active AND published",
            [d.planId],
          )
        ).rows[0];
        if (!p) throw new HttpError("Plano indisponível.", 404);
        const count = Number(
          (
            await c.query(
              "SELECT count(*) count FROM professionals WHERE tenant_id=$1 AND active",
              [d.tenantId],
            )
          ).rows[0].count,
        );
        if (count > p.max_professionals)
          throw new HttpError(
            "O limite do plano é menor que a equipe ativa.",
            409,
          );
        await c.query(
          "INSERT INTO subscriptions(tenant_id,plan_id,status,price_snapshot,professional_limit,period_end) VALUES($1,$2,'active',$3,$4,$5) ON CONFLICT(tenant_id) DO UPDATE SET plan_id=excluded.plan_id,status='active',price_snapshot=excluded.price_snapshot,professional_limit=excluded.professional_limit,period_end=excluded.period_end,updated_at=now()",
          [d.tenantId, p.id, p.monthly_price, p.max_professionals, d.periodEnd],
        );
        await c.query("UPDATE tenants SET billing_enforced=true WHERE id=$1", [
          d.tenantId,
        ]);
        await c.query(
          "INSERT INTO subscription_receipts(tenant_id,plan_id,amount,method,reference,period_end,recorded_by,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
          [
            d.tenantId,
            p.id,
            d.amount,
            d.method,
            d.reference,
            d.periodEnd,
            user.id,
            d.idempotencyKey,
          ],
        );
        await c.query(
          "UPDATE subscription_requests SET status=CASE WHEN plan_id=$2 THEN 'approved' ELSE 'declined' END,resolved_at=now() WHERE tenant_id=$1 AND status='pending'",
          [d.tenantId, p.id],
        );
        await c.query(
          "INSERT INTO platform_audit(actor_id,action,entity_id) VALUES($1,$2,$3)",
          [user.id, "subscription_manual_receipt", d.tenantId],
        );
        return;
      }
      if (raw.action === "status") {
        const d = z
          .object({
            action: z.literal("status"),
            tenantId: z.string().min(1).max(100),
            status: z.enum(["suspended", "cancelled"]),
            confirmed: z.literal(true),
          })
          .strict()
          .parse(raw);
        await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          "subscription:" + d.tenantId,
        ]);
        const changed = await c.query(
          "UPDATE subscriptions SET status=$2,updated_at=now() WHERE tenant_id=$1 AND tenant_id<>'demo'",
          [d.tenantId, d.status],
        );
        if (!changed.rowCount)
          throw new HttpError("Assinatura não encontrada.", 404);
        await c.query(
          "INSERT INTO platform_audit(actor_id,action,entity_id) VALUES($1,$2,$3)",
          [user.id, "subscription_" + d.status, d.tenantId],
        );
        return;
      }
      throw new HttpError("Operação inválida.");
    });
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (e) {
    return errorResponse(e);
  }
}
