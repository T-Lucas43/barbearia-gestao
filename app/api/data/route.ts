import { session, hash, sameOrigin } from "@/lib/auth";
import { db, transaction } from "@/lib/db";
import { commission, localDay } from "@/lib/domain";
import { randomBytes } from "node:crypto";
import { z } from "zod";
export async function GET(request: Request) {
  const auth = await session();
  if (!auth)
    return Response.json({ error: "Entre para continuar" }, { status: 401 });
  const day = new URL(request.url).searchParams.get("day") || localDay();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day))
    return Response.json({ error: "Data inválida" }, { status: 400 });
  const tenant = auth.tenant_id;
  const pid = auth.role === "barber" ? auth.professional_id : null;
  const [
    professionals,
    services,
    appointments,
    expenses,
    payouts,
    notifications,
    totals,
  ] = await Promise.all([
    db.query(
      "SELECT * FROM professionals WHERE tenant_id=$1 AND ($2::text IS NULL OR id=$2)",
      [tenant, pid],
    ),
    db.query("SELECT * FROM services WHERE tenant_id=$1 ORDER BY price", [
      tenant,
    ]),
    db.query(
      "SELECT a.*,p.name professional_name,p.color,s.name service_name FROM appointments a JOIN professionals p ON p.id=a.professional_id JOIN services s ON s.id=a.service_id WHERE a.tenant_id=$1 AND (a.starts_at AT TIME ZONE 'America/Sao_Paulo')::date=$2::date AND ($3::text IS NULL OR a.professional_id=$3) ORDER BY a.starts_at",
      [tenant, day, pid],
    ),
    pid
      ? Promise.resolve({ rows: [] })
      : db.query(
          "SELECT * FROM expenses WHERE tenant_id=$1 ORDER BY paid_at DESC",
          [tenant],
        ),
    db.query(
      "SELECT * FROM payouts WHERE tenant_id=$1 AND ($2::text IS NULL OR professional_id=$2) ORDER BY created_at DESC",
      [tenant, pid],
    ),
    pid
      ? Promise.resolve({ rows: [] })
      : db.query(
          "SELECT n.*,a.customer FROM notifications n JOIN appointments a ON a.id=n.appointment_id WHERE a.tenant_id=$1 ORDER BY n.due_at DESC LIMIT 30",
          [tenant],
        ),
    db.query(
      "SELECT professional_id,COALESCE(sum(commission),0)::int earned FROM appointments WHERE tenant_id=$1 AND status='completed' AND ($2::text IS NULL OR professional_id=$2) GROUP BY professional_id",
      [tenant, pid],
    ),
  ]);
  return Response.json({
    role: auth.role,
    professionalId: pid,
    professionals: professionals.rows,
    services: services.rows,
    appointments: appointments.rows,
    expenses: expenses.rows,
    payouts: payouts.rows,
    notifications: notifications.rows,
    totals: totals.rows,
  });
}
const booking = z.object({
  action: z.literal("book"),
  professionalId: z.string(),
  serviceId: z.string(),
  customer: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^\d{10,13}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hour: z.string().regex(/^\d{2}:\d{2}$/),
  consent: z.boolean().default(false),
});
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Origem inválida" }, { status: 403 });
  try {
    const body = await request.json();
    const auth = await session();
    if (body.action === "book") {
      const b = booking.parse(body);
      const publicBooking = !auth;
      const tenant = auth?.tenant_id || "demo";
      if (auth?.role === "barber" && b.professionalId !== auth.professional_id)
        return Response.json({ error: "Sem permissão" }, { status: 403 });
      const token = randomBytes(32).toString("hex");
      const result = await transaction(async (c) => {
        const service = (
          await c.query("SELECT * FROM services WHERE id=$1 AND tenant_id=$2", [
            b.serviceId,
            tenant,
          ])
        ).rows[0];
        const pro = (
          await c.query(
            "SELECT * FROM professionals WHERE id=$1 AND tenant_id=$2",
            [b.professionalId, tenant],
          )
        ).rows[0];
        if (!service || !pro)
          throw new Error("Serviço ou profissional inválido");
        const start = new Date(`${b.date}T${b.hour}:00-03:00`);
        const end = new Date(+start + service.duration * 60000);
        const minute =
          Number(b.hour.slice(0, 2)) * 60 + Number(b.hour.slice(3));
        const horizon = Date.now() + 60 * 86400000;
        if (
          !Number.isFinite(+start) ||
          minute < 540 ||
          minute + service.duration > 1080 ||
          minute % 15 !== 0 ||
          +start > horizon ||
          (publicBooking && +start < Date.now())
        )
          throw new Error(
            "Escolha um horário futuro entre 09h e 18h, em até 60 dias",
          );
        // Serializa limite público por contato para não ser contornado por concorrência.
        await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          tenant + b.phone,
        ]);
        const recent = await c.query(
          "SELECT count(*)::int n FROM appointments WHERE tenant_id=$1 AND phone=$2 AND created_at>now()-interval '1 hour'",
          [tenant, b.phone],
        );
        if (publicBooking && recent.rows[0].n >= 5)
          throw new Error(
            "Limite de reservas atingido. Entre em contato com a barbearia.",
          );
        const row = (
          await c.query(
            "INSERT INTO appointments(tenant_id,professional_id,service_id,customer,phone,starts_at,ends_at,price,commission_bps,commission,consent,manage_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id",
            [
              tenant,
              pro.id,
              service.id,
              b.customer,
              b.phone,
              start,
              end,
              service.price,
              pro.commission_bps,
              commission(service.price, pro.commission_bps),
              b.consent,
              hash(token),
            ],
          )
        ).rows[0];
        if (b.consent) {
          await c.query(
            "INSERT INTO notifications(appointment_id,kind,due_at) VALUES ($1,'confirmation',now())",
            [row.id],
          );
          if (+start - 7200000 > Date.now())
            await c.query(
              "INSERT INTO notifications(appointment_id,kind,due_at) VALUES ($1,'reminder',$2)",
              [row.id, new Date(+start - 7200000)],
            );
        }
        await c.query(
          "INSERT INTO audit_log(tenant_id,action,entity_id) VALUES ($1,'book',$2)",
          [tenant, row.id],
        );
        return row;
      });
      return Response.json({ ok: true, id: result.id, manageToken: token });
    }
    if (!auth)
      return Response.json({ error: "Entre para continuar" }, { status: 401 });
    if (body.action === "status") {
      const data = z
        .object({
          id: z.uuid(),
          status: z.enum([
            "confirmed",
            "in_progress",
            "completed",
            "cancelled",
            "no_show",
          ]),
          method: z.enum(["Pix", "Dinheiro", "Cartão"]).optional(),
        })
        .parse(body);
      await transaction(async (c) => {
        const a = (
          await c.query(
            "SELECT * FROM appointments WHERE id=$1 AND tenant_id=$2 FOR UPDATE",
            [data.id, auth.tenant_id],
          )
        ).rows[0];
        if (
          !a ||
          (auth.role === "barber" && a.professional_id !== auth.professional_id)
        )
          throw new Error("Atendimento não encontrado");
        if (a.status === data.status) return;
        if (["completed", "cancelled", "no_show"].includes(a.status))
          throw new Error("Atendimento já encerrado");
        if (data.status === "confirmed" && a.status !== "scheduled")
          throw new Error("Transição inválida");
        await c.query(
          "UPDATE appointments SET status=$1,paid=$2,payment_method=$3 WHERE id=$4",
          [
            data.status,
            data.status === "completed" ? a.price : 0,
            data.status === "completed" ? data.method || "Pix" : null,
            data.id,
          ],
        );
        if (["completed", "cancelled", "no_show"].includes(data.status))
          await c.query(
            "UPDATE notifications SET status='cancelled' WHERE appointment_id=$1 AND status='pending'",
            [data.id],
          );
        await c.query(
          "INSERT INTO audit_log(tenant_id,action,entity_id) VALUES ($1,$2,$3)",
          [auth.tenant_id, data.status, data.id],
        );
      });
      return Response.json({ ok: true });
    }
    if (auth.role !== "owner")
      return Response.json(
        { error: "Acesso do proprietário necessário" },
        { status: 403 },
      );
    if (body.action === "expense") {
      const d = z
        .object({
          description: z.string().trim().min(2).max(150),
          amount: z.number().int().positive().max(100000000),
        })
        .parse(body);
      await db.query(
        "INSERT INTO expenses(tenant_id,description,amount) VALUES ($1,$2,$3)",
        [auth.tenant_id, d.description, d.amount],
      );
      return Response.json({ ok: true });
    }
    if (body.action === "payout") {
      const d = z
        .object({
          professionalId: z.string(),
          amount: z.number().int().positive(),
        })
        .parse(body);
      await transaction(async (c) => {
        const pro = await c.query(
          "SELECT id FROM professionals WHERE id=$1 AND tenant_id=$2 FOR UPDATE",
          [d.professionalId, auth.tenant_id],
        );
        if (!pro.rowCount) throw new Error("Profissional não encontrado");
        const earned = (
          await c.query(
            "SELECT COALESCE(sum(commission),0)::int n FROM appointments WHERE tenant_id=$1 AND professional_id=$2 AND status='completed'",
            [auth.tenant_id, d.professionalId],
          )
        ).rows[0].n;
        const paid = (
          await c.query(
            "SELECT COALESCE(sum(amount),0)::int n FROM payouts WHERE tenant_id=$1 AND professional_id=$2",
            [auth.tenant_id, d.professionalId],
          )
        ).rows[0].n;
        if (d.amount > earned - paid)
          throw new Error("Valor maior que o saldo disponível");
        const r = await c.query(
          "INSERT INTO payouts(tenant_id,professional_id,amount) VALUES ($1,$2,$3) RETURNING id",
          [auth.tenant_id, d.professionalId, d.amount],
        );
        await c.query(
          "INSERT INTO audit_log(tenant_id,action,entity_id) VALUES ($1,'payout',$2)",
          [auth.tenant_id, r.rows[0].id],
        );
      });
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    const e = error as Error & { code?: string };
    if (e.code === "23P01")
      return Response.json(
        { error: "Este horário acabou de ser reservado. Escolha outro." },
        { status: 409 },
      );
    return Response.json(
      {
        error:
          error instanceof z.ZodError
            ? "Confira os dados informados"
            : e.code
              ? "Não foi possível salvar. Tente novamente."
              : e.message,
      },
      { status: 400 },
    );
  }
}
