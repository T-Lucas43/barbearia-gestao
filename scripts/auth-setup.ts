import { getMigrations } from "better-auth/db/migration";
import { auth, authOptions } from "../lib/auth-engine";
import { db } from "../lib/db";
export async function setupAuth() {
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.INITIAL_LOCAL_PASSWORD ||
      process.env.INITIAL_LOCAL_PASSWORD === "demo-local-2026" ||
      process.env.INITIAL_LOCAL_PASSWORD.length < 16)
  )
    throw Error(
      "Configure uma senha inicial administrativa exclusiva com pelo menos 16 caracteres.",
    );
  const migration = await getMigrations(authOptions);
  await migration.runMigrations();
  for (const account of [
    {
      email: "dono@navalha.local",
      name: "Proprietário",
      role: "owner",
      professional: null,
    },
    {
      email: "recepcao@navalha.local",
      name: "Recepção",
      role: "receptionist",
      professional: null,
    },
    {
      email: "rafael@navalha.local",
      name: "Rafael Costa",
      role: "barber",
      professional: "rafa",
    },
  ]) {
    const existing = (
      await db.query("SELECT id FROM auth_user WHERE email=$1", [account.email])
    ).rows[0];
    if (existing) continue;
    const result = await auth.api.signUpEmail({
      body: {
        name: account.name,
        email: account.email,
        password: process.env.INITIAL_LOCAL_PASSWORD || "demo-local-2026",
      },
    });
    await db.query(
      "INSERT INTO memberships(user_id,tenant_id,role,professional_id) VALUES ($1,$2,$3,$4)",
      [result.user.id, "demo", account.role, account.professional],
    );
    console.log("Conta local criada:", account.email);
  }
  if (process.env.DEMO_MODE === "true") {
    const email = "demo@navalha.local";
    let u = (await db.query("SELECT id FROM auth_user WHERE email=$1", [email]))
      .rows[0];
    if (!u)
      u = (
        await auth.api.signUpEmail({
          body: { name: "Demonstração", email, password: "DemoNavalha2026!" },
        })
      ).user;
    await db.query(
      "INSERT INTO memberships(user_id,tenant_id,role,read_only) VALUES ($1,'demo','owner',true) ON CONFLICT(user_id) DO UPDATE SET read_only=true WHERE memberships.tenant_id='demo'",
      [u.id],
    );
  }
}
