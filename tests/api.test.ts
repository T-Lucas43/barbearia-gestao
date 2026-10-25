import { test, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "../lib/db";
const base = "http://127.0.0.1:3000";
async function post(path: string, body: object, cookie?: string) {
  return fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: base,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}
async function login(profile: string) {
  const r = await post("/api/session", {
    profile,
    password: "demo-local-2026",
  });
  assert.equal(r.status, 200);
  return r.headers.get("set-cookie")!.split(";")[0];
}
after(async () => {
  await db.end();
});
test("rotas privadas exigem sessão e rejeitam origem externa", async () => {
  assert.equal((await fetch(base + "/api/data")).status, 401);
  const r = await fetch(base + "/api/data", {
    method: "POST",
    headers: {
      Origin: "https://invalid.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(r.status, 403);
});
test("barbeiro só recebe agenda própria e não registra despesas", async () => {
  const cookie = await login("rafa");
  const r = await fetch(base + "/api/data", { headers: { Cookie: cookie } });
  const d = await r.json();
  assert.ok(
    d.appointments.every(
      (a: { professional_id: string }) => a.professional_id === "rafa",
    ),
  );
  assert.equal(d.professionals.length, 1);
  assert.equal(d.expenses.length, 0);
  assert.equal(
    (
      await post(
        "/api/data",
        { action: "expense", description: "Teste", amount: 100 },
        cookie,
      )
    ).status,
    403,
  );
});
test("reserva concorrente, conclusão idempotente, snapshot e repasse concorrente", async () => {
  const owner = await login("owner");
  const date = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const phone = "11988887777";
  const body = {
    action: "book",
    professionalId: "leo",
    serviceId: "corte",
    customer: "Teste automatizado",
    phone,
    date,
    hour: "16:00",
    consent: true,
  };
  let id: string | undefined;
  let payoutId: string | undefined;
  try {
    const rs = await Promise.all([
      post("/api/data", body),
      post("/api/data", body),
    ]);
    assert.deepEqual(rs.map((r) => r.status).sort(), [200, 409]);
    const win = rs.find((r) => r.status === 200)!;
    id = (await win.json()).id;
    assert.ok(id);
    const a = (await db.query("SELECT * FROM appointments WHERE id=$1", [id]))
      .rows[0];
    assert.equal(a.price, 6000);
    assert.equal(a.commission, 2400);
    const r1 = await post(
      "/api/data",
      { action: "status", id, status: "completed", method: "Pix" },
      owner,
    );
    assert.equal(r1.status, 200);
    assert.equal(
      (
        await post(
          "/api/data",
          { action: "status", id, status: "completed", method: "Pix" },
          owner,
        )
      ).status,
      200,
    );
    const row = (
      await db.query("SELECT paid,commission FROM appointments WHERE id=$1", [
        id,
      ])
    ).rows[0];
    assert.equal(row.paid, 6000);
    assert.equal(row.commission, 2400);
    const pending = await db.query("SELECT count(*)::int n FROM notifications WHERE appointment_id=$1 AND status='pending'", [id]);
    assert.equal(pending.rows[0].n, 0, 'conclusão invalida lembretes pendentes');
    const balance = (
      await db.query(
        "SELECT ((SELECT COALESCE(sum(commission),0) FROM appointments WHERE professional_id='leo' AND tenant_id='demo' AND status='completed')-(SELECT COALESCE(sum(amount),0) FROM payouts WHERE professional_id='leo' AND tenant_id='demo'))::int n",
      )
    ).rows[0].n;
    const before = (
      await db.query("SELECT id FROM payouts WHERE professional_id='leo'")
    ).rows.map((r: { id: string }) => r.id);
    const ps = await Promise.all([
      post(
        "/api/data",
        { action: "payout", professionalId: "leo", amount: balance },
        owner,
      ),
      post(
        "/api/data",
        { action: "payout", professionalId: "leo", amount: balance },
        owner,
      ),
    ]);
    assert.deepEqual(ps.map((r) => r.status).sort(), [200, 400]);
    const added = (
      await db.query("SELECT id FROM payouts WHERE professional_id='leo'")
    ).rows.find((r: { id: string }) => !before.includes(r.id));
    payoutId = added?.id;
  } finally {
    // Remove apenas registros fictícios criados por este teste, por IDs conhecidos.
    if (payoutId) {
      await db.query("DELETE FROM audit_log WHERE entity_id=$1", [payoutId]);
      await db.query("DELETE FROM payouts WHERE id=$1", [payoutId]);
    }
    if (id) {
      await db.query("DELETE FROM notifications WHERE appointment_id=$1", [id]);
      await db.query("DELETE FROM audit_log WHERE entity_id=$1", [id]);
      await db.query("DELETE FROM appointments WHERE id=$1", [id]);
    }
  }
});
