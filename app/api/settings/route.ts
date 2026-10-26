import { requireOrigin, requireSession } from "@/lib/auth";
import { auth } from "@/lib/auth-engine";
import { db, transaction } from "@/lib/db";
import { z } from "zod";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { HttpError, errorResponse, amountSchema, dateSchema } from "@/lib/http";
import { instant } from "@/lib/availability";
import { audit } from "@/lib/finance";
export async function GET() {
  try {
    const s = await requireSession(["owner"]);
    const [tenant, pros, services, schedules, blocks, users, devices, rules] =
      await Promise.all([
        db.query("SELECT * FROM tenants WHERE id=$1", [s.tenant_id]),
        db.query(
          "SELECT * FROM professionals WHERE tenant_id=$1 ORDER BY name",
          [s.tenant_id],
        ),
        db.query("SELECT * FROM services WHERE tenant_id=$1 ORDER BY name", [
          s.tenant_id,
        ]),
        db.query(
          "SELECT * FROM working_schedules WHERE tenant_id=$1 ORDER BY professional_id,weekday",
          [s.tenant_id],
        ),
        db.query(
          "SELECT * FROM time_blocks WHERE tenant_id=$1 AND active AND ends_at>now() ORDER BY starts_at",
          [s.tenant_id],
        ),
        db.query(
          "SELECT u.id,u.name,u.email,m.role,m.professional_id,m.active FROM auth_user u JOIN memberships m ON m.user_id=u.id WHERE m.tenant_id=$1 ORDER BY u.name",
          [s.tenant_id],
        ),
        db.query(
          "SELECT id,name,expires_at,revoked_at,last_seen FROM tv_devices WHERE tenant_id=$1 ORDER BY created_at DESC",
          [s.tenant_id],
        ),
        db.query("SELECT * FROM professional_services WHERE tenant_id=$1", [
          s.tenant_id,
        ]),
      ]);
    const needed = [
      "WHATSAPP_ACCESS_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
      "WHATSAPP_API_VERSION",
      "WHATSAPP_APP_SECRET",
      "WHATSAPP_VERIFY_TOKEN",
      "WHATSAPP_TEMPLATE_CONFIRMATION",
      "WHATSAPP_TEMPLATE_REMINDER",
      "WHATSAPP_TEMPLATE_CANCELLATION",
      "WHATSAPP_TEMPLATE_RESCHEDULE",
    ];
    return Response.json(
      {
        tenant: tenant.rows[0],
        professionals: pros.rows,
        services: services.rows,
        schedules: schedules.rows,
        blocks: blocks.rows,
        users: users.rows,
        devices: devices.rows,
        rules: rules.rows,
        self: s.user_id,
        whatsapp: {
          enabled: process.env.WHATSAPP_ENABLED === "true",
          missing: needed.filter((n) => !process.env[n]),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const s = await requireSession(["owner"], true);
    const body = await request.json();
    if (body.action === "user_create") {
      const d = z
        .object({
          name: z.string().trim().min(2).max(100),
          email: z.email().transform((v) => v.toLowerCase()),
          password: z.string().min(10).max(128),
          role: z.enum(["owner", "receptionist", "barber"]),
          professionalId: z.string().nullable().default(null),
        })
        .parse(body);
      if (d.role === "barber" && !d.professionalId)
        throw new HttpError("Selecione o profissional vinculado.");
      if (
        d.professionalId &&
        !(
          await db.query(
            "SELECT id FROM professionals WHERE id=$1 AND tenant_id=$2 AND active",
            [d.professionalId, s.tenant_id],
          )
        ).rowCount
      )
        throw new HttpError("Profissional inválido.");
      if (
        (await db.query("SELECT id FROM auth_user WHERE email=$1", [d.email]))
          .rowCount
      )
        throw new HttpError("Este email já possui conta.", 409);
      const created = await auth.api.signUpEmail({
        body: { name: d.name, email: d.email, password: d.password },
      });
      try {
        await transaction(async (c) => {
          await c.query("SELECT set_config('app.user_id',$1,true)", [
            s.user_id,
          ]);
          await c.query(
            "INSERT INTO memberships(user_id,tenant_id,role,professional_id) VALUES ($1,$2,$3,$4)",
            [
              created.user.id,
              s.tenant_id,
              d.role,
              d.role === "barber" ? d.professionalId : null,
            ],
          );
          await audit(c, s.tenant_id, "user_create", created.user.id);
        });
      } catch (e) {
        await db.query('DELETE FROM auth_account WHERE "userId"=$1', [
          created.user.id,
        ]);
        await db.query("DELETE FROM auth_user WHERE id=$1", [created.user.id]);
        throw e;
      }
      return Response.json({ ok: true });
    }
    const result = await transaction(async (c) => {
      await c.query("SELECT set_config('app.user_id',$1,true)", [s.user_id]);
      if (body.action === "tenant") {
        const d = z
          .object({
            name: z.string().trim().min(2).max(100),
            slug: z
              .string()
              .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
              .min(3)
              .max(60),
            address: z.string().max(200),
            phone: z.string().max(30),
            cancellationMinutes: z.number().int().min(0).max(10080),
            reminderMinutes: z.number().int().min(15).max(10080),
          })
          .parse(body);
        await c.query(
          "UPDATE tenants SET name=$1,slug=$2,address=$3,phone=$4,cancellation_minutes=$5,reminder_minutes=$6 WHERE id=$7",
          [
            d.name,
            d.slug,
            d.address,
            d.phone,
            d.cancellationMinutes,
            d.reminderMinutes,
            s.tenant_id,
          ],
        );
        await audit(c, s.tenant_id, "tenant_update", s.tenant_id);
        return { ok: true };
      }
      if (body.action === "professional") {
        const d = z
          .object({
            id: z.string().optional(),
            name: z.string().trim().min(2).max(100),
            specialty: z.string().max(150),
            color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
            commissionBps: z.number().int().min(0).max(10000),
            commissionKind: z.enum(["percent", "fixed"]),
            commissionFixed: amountSchema,
            active: z.boolean(),
          })
          .parse(body);
        const id = d.id || randomUUID();
        if (d.id) {
          if (
            !(
              await c.query(
                "SELECT id FROM professionals WHERE id=$1 AND tenant_id=$2 FOR UPDATE",
                [id, s.tenant_id],
              )
            ).rowCount
          )
            throw new HttpError("Profissional não encontrado.", 404);
          await c.query(
            "UPDATE professionals SET name=$1,specialty=$2,color=$3,commission_bps=$4,commission_kind=$5,commission_fixed=$6,active=$7 WHERE id=$8 AND tenant_id=$9",
            [
              d.name,
              d.specialty,
              d.color,
              d.commissionBps,
              d.commissionKind,
              d.commissionFixed,
              d.active,
              id,
              s.tenant_id,
            ],
          );
        } else {
          await c.query(
            "INSERT INTO professionals(id,tenant_id,name,specialty,color,commission_bps,commission_kind,commission_fixed,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
            [
              id,
              s.tenant_id,
              d.name,
              d.specialty,
              d.color,
              d.commissionBps,
              d.commissionKind,
              d.commissionFixed,
              d.active,
            ],
          );
          await c.query(
            "INSERT INTO working_schedules(tenant_id,professional_id,weekday,enabled) SELECT $1,$2,d,d<>0 FROM generate_series(0,6) d",
            [s.tenant_id, id],
          );
        }
        await audit(c, s.tenant_id, "professional_update", id);
        return { ok: true, id };
      }
      if (body.action === "service") {
        const d = z
          .object({
            id: z.string().optional(),
            name: z.string().trim().min(2).max(100),
            description: z.string().max(300),
            price: amountSchema,
            duration: z.number().int().min(5).max(480),
            commissionBps: z.number().int().min(0).max(10000).nullable(),
            active: z.boolean(),
          })
          .parse(body);
        const id = d.id || randomUUID();
        if (d.id) {
          const r = await c.query(
            "UPDATE services SET name=$1,description=$2,price=$3,duration=$4,commission_bps=$5,active=$6 WHERE id=$7 AND tenant_id=$8",
            [
              d.name,
              d.description,
              d.price,
              d.duration,
              d.commissionBps,
              d.active,
              id,
              s.tenant_id,
            ],
          );
          if (!r.rowCount) throw new HttpError("Serviço não encontrado.", 404);
        } else
          await c.query(
            "INSERT INTO services(id,tenant_id,name,description,price,duration,commission_bps,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
            [
              id,
              s.tenant_id,
              d.name,
              d.description,
              d.price,
              d.duration,
              d.commissionBps,
              d.active,
            ],
          );
        await audit(c, s.tenant_id, "service_update", id);
        return { ok: true, id };
      }
      if (body.action === "service_rule") {
        const d = z
          .object({
            professionalId: z.string(),
            serviceId: z.string(),
            enabled: z.boolean(),
            price: amountSchema.nullable(),
            duration: z.number().int().min(5).max(480).nullable(),
            commissionBps: z.number().int().min(0).max(10000).nullable(),
          })
          .parse(body);
        await c.query(
          "INSERT INTO professional_services(tenant_id,professional_id,service_id,enabled,price,duration,commission_bps) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(professional_id,service_id) DO UPDATE SET enabled=excluded.enabled,price=excluded.price,duration=excluded.duration,commission_bps=excluded.commission_bps WHERE professional_services.tenant_id=excluded.tenant_id",
          [
            s.tenant_id,
            d.professionalId,
            d.serviceId,
            d.enabled,
            d.price,
            d.duration,
            d.commissionBps,
          ],
        );
        await audit(
          c,
          s.tenant_id,
          "service_rule",
          d.professionalId + ":" + d.serviceId,
        );
        return { ok: true };
      }
      if (body.action === "schedule") {
        const d = z
          .object({
            professionalId: z.string(),
            days: z
              .array(
                z.object({
                  weekday: z.number().int().min(0).max(6),
                  enabled: z.boolean(),
                  startMinute: z.number().int(),
                  endMinute: z.number().int(),
                  breakStart: z.number().int().nullable(),
                  breakEnd: z.number().int().nullable(),
                }),
              )
              .length(7),
          })
          .parse(body);
        if (new Set(d.days.map((x) => x.weekday)).size !== 7)
          throw new HttpError("Informe os sete dias da semana.");
        if (
          d.days.some(
            (day) => (day.breakStart === null) !== (day.breakEnd === null),
          )
        )
          throw new HttpError(
            "Preencha início e fim do intervalo, ou deixe ambos vazios.",
          );
        if (
          !(
            await c.query(
              "SELECT id FROM professionals WHERE id=$1 AND tenant_id=$2 FOR UPDATE",
              [d.professionalId, s.tenant_id],
            )
          ).rowCount
        )
          throw new HttpError("Profissional não encontrado.", 404);
        await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          "agenda:" + d.professionalId,
        ]);
        for (const day of d.days)
          await c.query(
            "INSERT INTO working_schedules(tenant_id,professional_id,weekday,enabled,start_minute,end_minute,break_start,break_end) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(professional_id,weekday) DO UPDATE SET enabled=excluded.enabled,start_minute=excluded.start_minute,end_minute=excluded.end_minute,break_start=excluded.break_start,break_end=excluded.break_end",
            [
              s.tenant_id,
              d.professionalId,
              day.weekday,
              day.enabled,
              day.startMinute,
              day.endMinute,
              day.breakStart,
              day.breakEnd,
            ],
          );
        await audit(c, s.tenant_id, "schedule", d.professionalId);
        return { ok: true };
      }
      if (body.action === "block") {
        const d = z
          .object({
            professionalId: z.string(),
            date: dateSchema,
            start: z.string(),
            endDate: dateSchema,
            end: z.string(),
            reason: z.string().trim().min(2).max(200),
          })
          .parse(body);
        const starts = instant(d.date, d.start),
          ends = instant(d.endDate, d.end);
        if (+ends <= +starts)
          throw new HttpError(
            "O fim do bloqueio deve ser posterior ao início.",
          );
        if (
          !(
            await c.query(
              "SELECT id FROM professionals WHERE id=$1 AND tenant_id=$2 FOR UPDATE",
              [d.professionalId, s.tenant_id],
            )
          ).rowCount
        )
          throw new HttpError("Profissional não encontrado.", 404);
        await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          "agenda:" + d.professionalId,
        ]);
        const row = (
          await c.query(
            "INSERT INTO time_blocks(tenant_id,professional_id,starts_at,ends_at,reason) VALUES ($1,$2,$3,$4,$5) RETURNING id",
            [s.tenant_id, d.professionalId, starts, ends, d.reason],
          )
        ).rows[0];
        await audit(c, s.tenant_id, "block", row.id);
        return { ok: true };
      }
      if (body.action === "unblock") {
        const id = z.uuid().parse(body.id);
        const r = await c.query(
          "UPDATE time_blocks SET active=false WHERE id=$1 AND tenant_id=$2 RETURNING id",
          [id, s.tenant_id],
        );
        if (!r.rowCount) throw new HttpError("Bloqueio não encontrado.", 404);
        await audit(c, s.tenant_id, "unblock", id);
        return { ok: true };
      }
      if (body.action === "user_access") {
        const d = z
          .object({
            id: z.string(),
            active: z.boolean(),
            role: z.enum(["owner", "receptionist", "barber"]),
            professionalId: z.string().nullable(),
          })
          .parse(body);
        await c.query("SELECT id FROM tenants WHERE id=$1 FOR UPDATE", [
          s.tenant_id,
        ]);
        const requester = (
          await c.query(
            "SELECT user_id FROM memberships WHERE user_id=$1 AND tenant_id=$2 AND role='owner' AND active",
            [s.user_id, s.tenant_id],
          )
        ).rows[0];
        if (!requester)
          throw new HttpError("Seu acesso de proprietário foi revogado.", 403);
        const member = (
          await c.query(
            "SELECT * FROM memberships WHERE user_id=$1 AND tenant_id=$2",
            [d.id, s.tenant_id],
          )
        ).rows[0];
        if (!member) throw new HttpError("Usuário não encontrado.", 404);
        if (d.id === s.user_id && (!d.active || d.role !== "owner"))
          throw new HttpError(
            "Você não pode remover seu próprio acesso de proprietário.",
          );
        await c.query(
          "UPDATE memberships SET active=$1,role=$2,professional_id=$3 WHERE user_id=$4 AND tenant_id=$5",
          [
            d.active,
            d.role,
            d.role === "barber" ? d.professionalId : null,
            d.id,
            s.tenant_id,
          ],
        );
        await c.query('DELETE FROM auth_session WHERE "userId"=$1', [d.id]);
        await audit(c, s.tenant_id, "user_access", d.id);
        return { ok: true };
      }
      if (body.action === "tv_create") {
        const d = z
          .object({
            name: z.string().trim().min(2).max(80),
            days: z.number().int().min(1).max(90).default(30),
          })
          .parse(body);
        const token = randomBytes(32).toString("hex");
        const r = (
          await c.query(
            "INSERT INTO tv_devices(tenant_id,name,token_hash,expires_at) VALUES ($1,$2,$3,now()+($4*interval '1 day')) RETURNING id",
            [
              s.tenant_id,
              d.name,
              createHash("sha256").update(token).digest("hex"),
              d.days,
            ],
          )
        ).rows[0];
        await audit(c, s.tenant_id, "tv_create", r.id);
        return { ok: true, token };
      }
      if (body.action === "tv_revoke") {
        const id = z.uuid().parse(body.id);
        await c.query(
          "UPDATE tv_devices SET revoked_at=now() WHERE id=$1 AND tenant_id=$2",
          [id, s.tenant_id],
        );
        await audit(c, s.tenant_id, "tv_revoke", id);
        return { ok: true };
      }
      throw new HttpError("Ação inválida.");
    });
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
