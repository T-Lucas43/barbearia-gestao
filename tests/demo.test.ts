import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
const base = "http://127.0.0.1:3000";
test(
  "demonstração consulta relatórios e não altera cadastros ou credenciais",
  { skip: process.env.DEMO_MODE !== "true" },
  async () => {
    const login = await fetch(base + "/api/session", {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "demo@navalha.local",
        password: "DemoNavalha2026!",
      }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers
      .getSetCookie()
      .map((v) => v.split(";")[0])
      .join("; ");
    const data = await (
      await fetch(base + "/api/data", { headers: { Cookie: cookie } })
    ).json();
    assert.equal(data.readOnly, true);
    const forbidden = await fetch(base + "/api/settings", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: base,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "service",
        name: "Não deve criar",
        price: 5000,
        duration: 30,
      }),
    });
    assert.equal(forbidden.status, 403);
    const change = await fetch(base + "/api/auth/change-password", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: base,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword: "DemoNavalha2026!",
        newPassword: "not-a-new-password",
      }),
    });
    assert.equal(change.status, 403);
    const pdf = await fetch(base + "/api/finance?export=pdf", {
      headers: { Cookie: cookie },
    });
    assert.equal(pdf.status, 200);
    assert.equal(
      Buffer.from(await pdf.arrayBuffer())
        .subarray(0, 5)
        .toString(),
      "%PDF-",
    );
  },
);
