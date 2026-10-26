import { assertProductionReadiness } from "@/lib/operations";
import { readJson } from "@/lib/http";
import { requireOrigin } from "@/lib/auth";
import { auth } from "@/lib/auth-engine";
import { db, transaction } from "@/lib/db";
import { amountSchema, errorResponse, HttpError, rateLimit } from "@/lib/http";
import { legalVersion, signupAvailable } from "@/lib/onboarding";
import { randomUUID } from "node:crypto";
import { z } from "zod";
export async function POST(request: Request) {
  let createdUser: string | undefined;
  try {
    requireOrigin(request);
    if (!signupAvailable())
      throw new HttpError(
        "O cadastro comercial ainda está em preparação. A demonstração continua disponível.",
        503,
      );
    await assertProductionReadiness();
    const d = z
      .object({
        name: z.string().trim().min(2).max(100),
        email: z.email().trim().toLowerCase(),
        password: z.string().min(10).max(128),
        shop: z.string().trim().min(2).max(100),
        slug: z
          .string()
          .min(3)
          .max(60)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        planId: z.string().min(1).max(60),
        quotedPrice: amountSchema,
        quotedLimit: z.number().int().min(1).max(1000),
        ownerWorks: z.boolean(),
        sharePercent: z.number().min(0).max(100),
        accepted: z.literal(true),
        legalVersion: z.literal(legalVersion),
        website: z.literal("").default(""),
      })
      .strict()
      .parse(await readJson(request));
    if (
      [
        "demo",
        "api",
        "tv",
        "admin",
        "administracao",
        "comecar",
        "planos",
        "studio-da-navalha",
      ].includes(d.slug)
    )
      throw new HttpError("Escolha outro endereço para a barbearia.", 409);
    await rateLimit("onboarding-global", 100, 3600);
    await rateLimit("onboarding:" + d.email, 3, 3600);
    if (
      (await db.query("SELECT 1 FROM tenants WHERE slug=$1", [d.slug])).rowCount
    )
      throw new HttpError("Este endereço já está em uso.", 409);
    const plan = (
      await db.query(
        "SELECT * FROM plans WHERE id=$1 AND published AND active",
        [d.planId],
      )
    ).rows[0];
    if (
      !plan ||
      plan.monthly_price !== d.quotedPrice ||
      plan.max_professionals !== d.quotedLimit
    )
      throw new HttpError(
        "O plano mudou ou está indisponível. Atualize a página antes de continuar.",
        409,
      );
    if (
      (
        await db.query("SELECT 1 FROM auth_user WHERE lower(email)=$1", [
          d.email,
        ])
      ).rowCount
    )
      throw new HttpError(
        "Não foi possível cadastrar esses dados. Se já possui acesso, entre ou recupere a senha.",
        409,
      );
    const account = await auth.api.signUpEmail({
      body: { name: d.name, email: d.email, password: d.password },
    });
    createdUser = account.user.id;
    const tenant = "shop-" + randomUUID();
    await transaction(async (c) => {
      const p = (
        await c.query(
          "SELECT * FROM plans WHERE id=$1 AND published AND active FOR SHARE",
          [d.planId],
        )
      ).rows[0];
      if (
        !p ||
        p.monthly_price !== d.quotedPrice ||
        p.max_professionals !== d.quotedLimit
      )
        throw new HttpError(
          "O plano mudou. Atualize a página e tente novamente.",
          409,
        );
      await c.query(
        "INSERT INTO tenants(id,name,slug,billing_enforced,privacy_email) VALUES($1,$2,$3,true,$4)",
        [tenant, d.shop, d.slug, d.email],
      );
      let professional: string | null = null;
      if (d.ownerWorks) {
        professional = randomUUID();
        await c.query(
          "INSERT INTO professionals(id,tenant_id,name,specialty,color,commission_bps) VALUES($1,$2,$3,$4,$5,$6)",
          [
            professional,
            tenant,
            d.name,
            "Profissional responsável",
            "#d5ae59",
            Math.round(d.sharePercent * 100),
          ],
        );
        await c.query(
          "INSERT INTO working_schedules(tenant_id,professional_id,weekday,enabled) SELECT $1,$2,d,d<>0 FROM generate_series(0,6) d",
          [tenant, professional],
        );
      }
      await c.query(
        "INSERT INTO memberships(user_id,tenant_id,role,professional_id) VALUES($1,$2,'owner',$3)",
        [createdUser, tenant, professional],
      );
      await c.query(
        "INSERT INTO subscriptions(tenant_id,plan_id,price_snapshot,professional_limit) VALUES($1,$2,$3,$4)",
        [tenant, p.id, p.monthly_price, p.max_professionals],
      );
      await c.query(
        "INSERT INTO subscription_requests(tenant_id,plan_id,created_by) VALUES($1,$2,$3)",
        [tenant, p.id, createdUser],
      );
      await c.query(
        "INSERT INTO legal_acceptances(user_id,tenant_id,version) VALUES($1,$2,$3)",
        [createdUser, tenant, legalVersion],
      );
    });
    createdUser = undefined;
    return Response.json(
      {
        ok: true,
        slug: d.slug,
        message:
          process.env.REQUIRE_EMAIL_VERIFICATION === "true"
            ? "Confirme seu e-mail para entrar. A assinatura será ativada após confirmação manual pela administração."
            : "Conta criada. Entre para acompanhar a ativação manual da assinatura.",
      },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    if (createdUser)
      await db
        .query(
          "DELETE FROM auth_user WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM memberships WHERE user_id=$1)",
          [createdUser],
        )
        .catch(() => {
          console.error(
            JSON.stringify({ event: "onboarding_cleanup_required" }),
          );
        });
    return errorResponse(e);
  }
}
