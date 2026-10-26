import { readJson } from "@/lib/http";
import { requireOrigin, requireSession } from "@/lib/auth";
import { db, transaction } from "@/lib/db";
import { errorResponse, HttpError, rateLimit } from "@/lib/http";
import { subscriptionFor } from "@/lib/subscription";
import { z } from "zod";
const privateHeaders = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const s = await requireSession(["owner"]);
    const [subscription, plans, requests, receipts] = await Promise.all([
      subscriptionFor(s.tenant_id),
      db.query(
        "SELECT id,name,description,monthly_price,max_professionals FROM plans WHERE published AND active ORDER BY monthly_price",
      ),
      db.query(
        "SELECT r.id,r.status,r.created_at,p.name plan_name FROM subscription_requests r JOIN plans p ON p.id=r.plan_id WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 20",
        [s.tenant_id],
      ),
      db.query(
        "SELECT id,amount,method,period_end,created_at FROM subscription_receipts WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 30",
        [s.tenant_id],
      ),
    ]);
    const count = Number(
      (
        await db.query(
          "SELECT count(*) count FROM professionals WHERE tenant_id=$1 AND active",
          [s.tenant_id],
        )
      ).rows[0].count,
    );
    return Response.json(
      {
        subscription,
        plans: plans.rows,
        requests: requests.rows,
        receipts: receipts.rows,
        professionals: count,
        supportEmail: process.env.SUPPORT_EMAIL || "",
        demo: s.is_demo,
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
    const s = await requireSession(["owner"]);
    if (s.is_demo || s.read_only)
      throw new HttpError("A demonstração não contrata planos.", 403);
    await rateLimit("plan-request:" + s.user_id, 10, 3600);
    const d = z
      .object({ planId: z.string().min(1).max(60) })
      .strict()
      .parse(await readJson(request));
    const id = await transaction(async (c) => {
      const p = (
        await c.query(
          "SELECT id,max_professionals FROM plans WHERE id=$1 AND published AND active",
          [d.planId],
        )
      ).rows[0];
      if (!p) throw new HttpError("Plano indisponível.", 404);
      const count = Number(
        (
          await c.query(
            "SELECT count(*) count FROM professionals WHERE tenant_id=$1 AND active",
            [s.tenant_id],
          )
        ).rows[0].count,
      );
      if (count > p.max_professionals)
        throw new HttpError(
          "Este plano comporta menos profissionais que a equipe atual.",
          409,
        );
      return (
        await c.query(
          "INSERT INTO subscription_requests(tenant_id,plan_id,created_by) VALUES($1,$2,$3) RETURNING id",
          [s.tenant_id, p.id, s.user_id],
        )
      ).rows[0].id;
    });
    return Response.json(
      {
        ok: true,
        id,
        message:
          "Solicitação registrada. A ativação depende da confirmação manual pela administração.",
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
