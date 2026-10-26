import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { readdir, readFile, unlink } from "node:fs/promises";
import { db } from "../lib/db";
import { auth } from "../lib/auth-engine";
const base =
  process.env.APP_URL?.replace("localhost", "127.0.0.1") ||
  "http://127.0.0.1:3000";
const key = randomUUID();
const tenant = "qa-platform-" + key;
const other = "qa-other-" + key;
const plan = "qa-" + key;
const password = "Teste-plataforma-2026!";
const ids: string[] = [];
const tenants = [tenant, other];
let adminId = "";
let ownerEmail = "";
let ownerUser = "";
let ownerPro = "";
class Agent {
  jar = new Map<string, string>();
  async request(path: string, body?: object, method = body ? "POST" : "GET") {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json", Origin: base } : {}),
        Cookie: [...this.jar].map(([k, v]) => k + "=" + v).join("; "),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "manual",
    });
    for (const value of response.headers.getSetCookie()) {
      const cookie = value.split(";")[0];
      const split = cookie.indexOf("=");
      const name = cookie.slice(0, split),
        content = cookie.slice(split + 1);
      if (content) this.jar.set(name, content);
      else this.jar.delete(name);
    }
    return response;
  }
  async login(email: string, pwd = password) {
    return this.request("/api/session", { email, password: pwd });
  }
}
const admin = new Agent(),
  owner = new Agent(),
  outsider = new Agent(),
  anonymous = new Agent();
async function jsonOK(agent: Agent, path: string, body?: object) {
  const response = await agent.request(path, body);
  const result = await response.json();
  assert.ok(
    response.ok,
    JSON.stringify({
      path,
      status: response.status,
      error: result.error || result.message,
    }),
  );
  return result;
}
before(async () => {
  for (const [tid, email, agent, platform] of [
    [tenant, "admin-" + key + "@example.test", admin, true],
    [other, "outside-" + key + "@example.test", outsider, false],
  ] as const) {
    const u = (
      await auth.api.signUpEmail({
        body: { name: "Conta QA", email, password },
      })
    ).user;
    ids.push(u.id);
    await db.query("INSERT INTO tenants(id,name,slug) VALUES($1,$2,$1)", [
      tid,
      "Barbearia QA isolada",
    ]);
    if (!platform)
      await db.query(
        "INSERT INTO memberships(user_id,tenant_id,role) VALUES($1,$2,'owner')",
        [u.id, tid],
      );
    if (platform) {
      adminId = u.id;
      await db.query("INSERT INTO platform_admins(user_id) VALUES($1)", [u.id]);
    }
    assert.equal((await agent.login(email)).status, 200);
  }
});
after(async () => {
  for (const tid of tenants) {
    await db.query(
      "DELETE FROM notifications WHERE appointment_id IN(SELECT id FROM appointments WHERE tenant_id=$1)",
      [tid],
    );
    for (const table of [
      "memberships",
      "manual_reminder_tasks",
      "privacy_events",
      "cash_movements",
      "payments",
      "resource_slots",
      "appointments",
      "expenses",
      "payouts",
      "advances",
      "time_blocks",
      "working_schedules",
      "professional_services",
      "services",
      "professionals",
      "legal_acceptances",
      "subscription_requests",
      "subscription_receipts",
      "subscriptions",
      "tv_devices",
      "request_records",
      "audit_log",
    ])
      await db.query("DELETE FROM " + table + " WHERE tenant_id=$1", [tid]);
    await db.query("DELETE FROM tenants WHERE id=$1", [tid]);
  }
  await db.query("DELETE FROM platform_audit WHERE actor_id=ANY($1::text[])", [
    ids,
  ]);
  await db.query("DELETE FROM plans WHERE id=$1", [plan]);
  for (const uid of ids) {
    await db.query('DELETE FROM auth_account WHERE "userId"=$1', [uid]);
    await db.query('DELETE FROM auth_session WHERE "userId"=$1', [uid]);
    await db.query("DELETE FROM auth_user WHERE id=$1", [uid]);
  }
  for (const filename of await readdir("tmp/mailbox").catch(() => [])) {
    if (!filename.endsWith(".json")) continue;
    const p = "tmp/mailbox/" + filename;
    const mail = JSON.parse(await readFile(p, "utf8"));
    if (String(mail.to).includes(key)) await unlink(p);
  }
  await db.end();
});
test("SaaS isola cadastro, confirmação manual, limite concorrente e renovação", async () => {
  const signupPage = await anonymous.request("/comecar");
  assert.equal(signupPage.status, 200);
  assert.match(await signupPage.text(), /Organize o próximo capítulo/);
  assert.equal((await anonymous.request("/api/platform")).status, 401);
  assert.equal((await outsider.request("/api/platform")).status, 403);
  const planBody = {
    action: "plan",
    id: plan,
    name: "Plano temporário de QA",
    description: "Somente teste local",
    monthlyPrice: 990,
    maxProfessionals: 2,
    published: false,
    active: true,
  };
  await jsonOK(admin, "/api/platform", planBody);
  let catalog = await jsonOK(anonymous, "/api/plans");
  assert.ok(!catalog.plans.some((p: any) => p.id === plan));
  await jsonOK(admin, "/api/platform", { ...planBody, published: true });
  catalog = await jsonOK(anonymous, "/api/plans");
  assert.ok(catalog.plans.some((p: any) => p.id === plan));
  assert.equal(catalog.signupEnabled, true);
  const slug = "qa-signup-" + key;
  ownerEmail = "owner-" + key + "@example.test";
  const created = await anonymous.request("/api/onboarding", {
    name: "Dona da barbearia QA",
    email: ownerEmail,
    password,
    shop: "Barbearia cadastrada QA",
    slug,
    planId: plan,
    quotedPrice: 990,
    quotedLimit: 2,
    ownerWorks: true,
    sharePercent: 60,
    accepted: true,
    legalVersion: catalog.legalVersion,
    website: "",
  });
  assert.equal(
    created.status,
    201,
    JSON.stringify(await created.clone().json()),
  );
  const member = (
    await db.query(
      "SELECT m.user_id,m.professional_id,m.tenant_id FROM memberships m JOIN auth_user u ON u.id=m.user_id WHERE u.email=$1",
      [ownerEmail],
    )
  ).rows[0];
  ownerUser = member.user_id;
  ownerPro = member.professional_id;
  ids.push(ownerUser);
  tenants.push(member.tenant_id);
  assert.equal((await owner.login(ownerEmail)).status, 200);
  const ownData = await jsonOK(owner, "/api/data");
  assert.equal(ownData.appointments.length, 0);
  assert.equal(ownData.professionals.length, 1);
  assert.equal(ownData.subscription.state, "pending");
  assert.equal(ownData.professionals[0].commission_bps, 6000);
  const prof = {
    action: "professional",
    name: "Profissional de teste",
    specialty: "QA",
    color: "#aabbcc",
    commissionBps: 6000,
    commissionKind: "percent",
    commissionFixed: 0,
    active: true,
  };
  assert.equal((await owner.request("/api/settings", prof)).status, 403);
  assert.equal((await owner.request("/api/platform")).status, 403);
  assert.equal(
    (
      await owner.request("/api/subscription", {
        planId: plan,
        status: "active",
      })
    ).status,
    400,
  );
  const receipt = {
    action: "receipt",
    tenantId: member.tenant_id,
    planId: plan,
    amount: 990,
    method: "Pix",
    reference: "QA fictício, nenhum valor recebido",
    periodEnd: new Date(Date.now() + 86400000 * 31).toISOString(),
    confirmed: true,
    idempotencyKey: randomUUID(),
  };
  assert.equal(
    (await admin.request("/api/platform", { ...receipt, confirmed: false }))
      .status,
    400,
  );
  await jsonOK(admin, "/api/platform", receipt);
  await jsonOK(admin, "/api/platform", receipt);
  assert.equal(
    Number(
      (
        await db.query(
          "SELECT count(*) count FROM subscription_receipts WHERE tenant_id=$1",
          [member.tenant_id],
        )
      ).rows[0].count,
    ),
    1,
  );
  assert.equal(
    (await admin.request("/api/platform", { ...receipt, amount: 1000 })).status,
    409,
  );
  const additions = await Promise.all([
    owner.request("/api/settings", {
      ...prof,
      name: "Profissional concorrente A",
    }),
    owner.request("/api/settings", {
      ...prof,
      name: "Profissional concorrente B",
    }),
  ]);
  assert.deepEqual(additions.map((r) => r.status).sort(), [200, 409]);
  const outside = await jsonOK(outsider, "/api/subscription");
  assert.equal(outside.receipts.length, 0);
  assert.ok(!JSON.stringify(outside).includes(member.tenant_id));
  await db.query(
    "UPDATE subscriptions SET period_end=now()-interval '1 day' WHERE tenant_id=$1",
    [member.tenant_id],
  );
  assert.equal((await owner.request("/api/settings", prof)).status, 403);
  assert.equal((await owner.request("/api/data")).status, 200);
  const billing = await jsonOK(owner, "/api/subscription");
  assert.equal(billing.subscription.state, "expired");
  await jsonOK(owner, "/api/subscription", { planId: plan });
  await jsonOK(admin, "/api/platform", {
    ...receipt,
    idempotencyKey: randomUUID(),
    amount: 0,
    method: "Cortesia",
    reference: "Cortesia fictícia de QA",
  });
  assert.equal(
    (await jsonOK(owner, "/api/subscription")).subscription.state,
    "active",
  );
  await jsonOK(admin, "/api/platform", {
    action: "status",
    tenantId: member.tenant_id,
    status: "suspended",
    confirmed: true,
  });
  assert.equal((await owner.request("/api/settings", prof)).status, 403);
  assert.equal((await owner.request("/api/data")).status, 200);
});
test("confirmação usa fragmento, não abre sessão e reenvio não enumera contas", async () => {
  const response = await anonymous.request("/api/access", {
    action: "resend_verification",
    email: ownerEmail,
  });
  assert.equal(response.status, 202);
  const unknown = await anonymous.request("/api/access", {
    action: "resend_verification",
    email: "verify-unknown-" + key + "@example.test",
  });
  assert.equal(unknown.status, 202);
  assert.deepEqual(await unknown.json(), await response.json());
  let token = "";
  for (const file of await readdir("tmp/mailbox")) {
    const mail = JSON.parse(await readFile("tmp/mailbox/" + file, "utf8"));
    if (mail.to === ownerEmail && mail.kind === "verify") {
      const link = new URL(mail.url);
      assert.equal(link.search, "");
      token = new URLSearchParams(link.hash.slice(1)).get("token") || "";
    }
  }
  assert.ok(token);
  assert.equal(
    (await anonymous.request("/api/access", { action: "verify_email", token }))
      .status,
    200,
  );
  assert.equal(
    (
      await db.query('SELECT "emailVerified" FROM auth_user WHERE id=$1', [
        ownerUser,
      ])
    ).rows[0].emailVerified,
    true,
  );
  assert.equal((await anonymous.request("/api/data")).status, 401);
  assert.equal(
    (
      await anonymous.request("/api/access", {
        action: "verify_email",
        token: "invalid-verification-token",
      })
    ).status,
    400,
  );
});
test("recuperação mantém resposta genérica, usa token único e revoga sessões", async () => {
  const response = await anonymous.request("/api/access", {
    action: "request",
    email: ownerEmail,
  });
  assert.equal(response.status, 202);
  const message = await response.json();
  const unknown = await anonymous.request("/api/access", {
    action: "request",
    email: "unknown-" + key + "@example.test",
  });
  assert.equal(unknown.status, 202);
  assert.deepEqual(await unknown.json(), message);
  const mailfiles = await readdir("tmp/mailbox");
  let token = "";
  for (const file of mailfiles) {
    const mail = JSON.parse(await readFile("tmp/mailbox/" + file, "utf8"));
    if (mail.to === ownerEmail && mail.kind === "reset")
      token =
        new URLSearchParams(new URL(mail.url).hash.slice(1)).get("token") || "";
  }
  assert.ok(token, "Link de recuperação capturado localmente.");
  const changed = await anonymous.request("/api/access", {
    action: "reset",
    token,
    password: password + "nova",
  });
  assert.equal(changed.status, 200);
  assert.equal((await owner.request("/api/data")).status, 401);
  assert.equal(
    (
      await anonymous.request("/api/access", {
        action: "reset",
        token,
        password: password + "outra",
      })
    ).status,
    400,
  );
  assert.equal((await owner.login(ownerEmail, password + "nova")).status, 200);
  const old = await new Agent().login(ownerEmail);
  assert.equal(old.status, 401);
  const huge = await fetch(base + "/api/access", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "request", email: "a".repeat(70000) }),
  });
  assert.equal(huge.status, 413);
  const foreign = await fetch(base + "/api/access", {
    method: "POST",
    headers: {
      Origin: "https://externo.invalid",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "request", email: ownerEmail }),
  });
  assert.equal(foreign.status, 403);
});
function totp(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.toUpperCase().replace(/=+$/, ""))
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8)
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = h[h.length - 1] & 15;
  return String((h.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}
test("segundo fator só autentica após código e código de recuperação não pode repetir", async () => {
  const enabled = await jsonOK(admin, "/api/auth/two-factor/enable", {
    password,
  });
  const secret = new URL(enabled.totpURI).searchParams.get("secret")!;
  assert.ok(secret);
  assert.equal((await jsonOK(admin, "/api/account/security")).enabled, false);
  const valid = totp(secret);
  const invalid = valid === "000000" ? "000001" : "000000";
  assert.equal(
    (await admin.request("/api/auth/two-factor/verify-totp", { code: invalid }))
      .status,
    401,
  );
  await jsonOK(admin, "/api/auth/two-factor/verify-totp", {
    code: totp(secret),
    trustDevice: false,
  });
  await jsonOK(admin, "/api/auth/revoke-other-sessions", {});
  assert.equal((await jsonOK(admin, "/api/account/security")).enabled, true);
  const challenge = new Agent();
  const signIn = await challenge.login("admin-" + key + "@example.test");
  assert.equal(signIn.status, 200);
  assert.equal((await signIn.json()).twoFactorRedirect, true);
  assert.equal((await challenge.request("/api/platform")).status, 401);
  await jsonOK(challenge, "/api/auth/two-factor/verify-totp", {
    code: totp(secret),
    trustDevice: false,
  });
  assert.equal((await challenge.request("/api/platform")).status, 200);
  const recovery = new Agent();
  await recovery.login("admin-" + key + "@example.test");
  await jsonOK(recovery, "/api/auth/two-factor/verify-backup-code", {
    code: enabled.backupCodes[0],
    trustDevice: false,
  });
  const repeated = new Agent();
  await repeated.login("admin-" + key + "@example.test");
  assert.equal(
    (
      await repeated.request("/api/auth/two-factor/verify-backup-code", {
        code: enabled.backupCodes[0],
      })
    ).status,
    401,
  );
  assert.equal((await repeated.request("/api/platform")).status, 401);
});
test("privacidade preserva valores, invalida gestão e não alcança outra empresa", async () => {
  const tid = (
    await db.query("SELECT tenant_id FROM memberships WHERE user_id=$1", [
      ownerUser,
    ])
  ).rows[0].tenant_id;
  const service = "qa-service-" + key;
  await db.query(
    "INSERT INTO services(id,tenant_id,name,description,price,duration) VALUES($1,$2,$3,$4,6000,30)",
    [service, tid, "Serviço QA", "Fictício"],
  );
  const appointment = (
    await db.query(
      "INSERT INTO appointments(tenant_id,professional_id,service_id,customer,phone,starts_at,ends_at,price,list_price,service_name_snapshot,commission_bps,commission,status,paid,manage_hash) VALUES($1,$2,$3,'Cliente QA','11912345678',now()-interval '3 days',now()-interval '3 days'+interval '30 min',6000,6000,'Serviço QA',6000,3600,'completed',0,$4) RETURNING id",
      [tid, ownerPro, service, randomUUID()],
    )
  ).rows[0].id;
  assert.equal(
    (
      await outsider.request("/api/privacy", {
        action: "export",
        phone: "11912345678",
      })
    ).status,
    404,
  );
  const data = await jsonOK(owner, "/api/privacy", {
    action: "export",
    phone: "11912345678",
  });
  assert.equal(data.appointments.length, 1);
  assert.ok(!JSON.stringify(data).includes("manage_hash"));
  assert.equal(
    (
      await owner.request("/api/privacy", {
        action: "anonymize",
        phone: "11912345678",
        confirmed: false,
      })
    ).status,
    400,
  );
  await jsonOK(owner, "/api/privacy", {
    action: "anonymize",
    phone: "11912345678",
    confirmed: true,
  });
  const row = (
    await db.query(
      "SELECT customer,phone,price,commission,manage_cipher,manage_expires_at FROM appointments WHERE id=$1",
      [appointment],
    )
  ).rows[0];
  assert.equal(row.customer, "Cliente anonimizado");
  assert.equal(row.phone, "");
  assert.equal(row.price, 6000);
  assert.equal(row.commission, 3600);
  assert.equal(row.manage_cipher, null);
  assert.ok(+new Date(row.manage_expires_at) <= Date.now());
});
