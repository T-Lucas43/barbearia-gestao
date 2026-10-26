import { readJson } from "@/lib/http";
import { requireOrigin, requireSession } from "@/lib/auth";
import { db, transaction } from "@/lib/db";
import { errorResponse, HttpError, rateLimit } from "@/lib/http";
import { z } from "zod";
import { randomBytes } from "node:crypto";
export async function GET() {
  try {
    const s = await requireSession(["owner"]);
    const tenant = (
      await db.query(
        "SELECT privacy_email,privacy_retention_days FROM tenants WHERE id=$1",
        [s.tenant_id],
      )
    ).rows[0];
    return Response.json(
      { policy: tenant, demo: s.is_demo },
      { headers: { "Cache-Control": "private, no-store" } },
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
      throw new HttpError(
        "A demonstração não exporta nem anonimiza dados pessoais.",
        403,
      );
    await rateLimit("privacy:" + s.user_id, 20, 3600);
    const d = z
      .discriminatedUnion("action", [
        z
          .object({
            action: z.literal("policy"),
            email: z.email().trim(),
            days: z.number().int().min(30).max(3650),
          })
          .strict(),
        z
          .object({
            action: z.literal("export"),
            phone: z.string().regex(/^\d{10,13}$/),
          })
          .strict(),
        z
          .object({
            action: z.literal("anonymize"),
            phone: z.string().regex(/^\d{10,13}$/),
            confirmed: z.literal(true),
          })
          .strict(),
      ])
      .parse(await readJson(request));
    if (d.action === "policy") {
      await transaction(async (c) => {
        await c.query(
          "UPDATE tenants SET privacy_email=$1,privacy_retention_days=$2 WHERE id=$3",
          [d.email, d.days, s.tenant_id],
        );
        await c.query(
          "INSERT INTO privacy_events(tenant_id,actor_id,action) VALUES($1,$2,'policy_update')",
          [s.tenant_id, s.user_id],
        );
      });
      return Response.json(
        { ok: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (d.action === "export") {
      const rows = (
        await db.query(
          "SELECT a.id,a.customer,a.phone,a.starts_at,a.ends_at,a.status,COALESCE(a.service_name_snapshot,se.name) service_name,p.name professional_name,a.price,a.paid,a.consent,a.created_at FROM appointments a JOIN services se ON se.id=a.service_id JOIN professionals p ON p.id=a.professional_id WHERE a.tenant_id=$1 AND a.phone=$2 ORDER BY a.starts_at",
          [s.tenant_id, d.phone],
        )
      ).rows;
      if (!rows.length)
        throw new HttpError("Nenhum registro encontrado nesta barbearia.", 404);
      await db.query(
        "INSERT INTO privacy_events(tenant_id,actor_id,action) VALUES($1,$2,'customer_export')",
        [s.tenant_id, s.user_id],
      );
      return Response.json(
        {
          generatedAt: new Date().toISOString(),
          shopId: s.tenant_id,
          appointments: rows,
        },
        {
          headers: {
            "Cache-Control": "private, no-store",
            "Content-Disposition": 'attachment; filename="dados-cliente.json"',
          },
        },
      );
    }
    const count = await transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        "privacy:" + s.tenant_id + ":" + d.phone,
      ]);
      const rows = (
        await c.query(
          "SELECT id,status,starts_at FROM appointments WHERE tenant_id=$1 AND phone=$2 FOR UPDATE",
          [s.tenant_id, d.phone],
        )
      ).rows;
      if (!rows.length)
        throw new HttpError("Nenhum registro encontrado nesta barbearia.", 404);
      if (
        rows.some(
          (a) =>
            a.status === "in_progress" ||
            (["scheduled", "confirmed"].includes(a.status) &&
              +new Date(a.starts_at) > Date.now()),
        )
      )
        throw new HttpError(
          "Há atendimento em andamento ou reserva futura. Resolva esses agendamentos antes de anonimizar.",
          409,
        );
      const ids = rows.map((a) => a.id);
      await c.query(
        "UPDATE appointments a SET customer='Cliente anonimizado',phone='',consent=false,manage_hash=v.hash,manage_cipher=NULL,manage_expires_at=now() FROM unnest($2::uuid[],$3::text[]) AS v(id,hash) WHERE a.tenant_id=$1 AND a.id=v.id",
        [s.tenant_id, ids, ids.map(() => randomBytes(32).toString("hex"))],
      );
      await c.query(
        "UPDATE notifications SET status=CASE WHEN status IN ('pending','retry','processing') THEN 'cancelled' ELSE status END,last_error=NULL WHERE appointment_id=ANY($1::uuid[])",
        [ids],
      );
      for (const id of ids)
        await c.query(
          "INSERT INTO privacy_events(tenant_id,actor_id,action,appointment_id) VALUES($1,$2,'customer_anonymize',$3)",
          [s.tenant_id, s.user_id, id],
        );
      return rows.length;
    });
    return Response.json(
      {
        ok: true,
        count,
        message:
          "Identificação do cliente removida. Valores e histórico financeiro foram preservados.",
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
