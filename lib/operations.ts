import { db } from "./db";
import { mailReady } from "./mail";
import { HttpError } from "./http";
export async function operationReadiness() {
  const role = (
    await db.query(
      "SELECT bool_or(rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls) elevated FROM pg_roles WHERE rolname IN (session_user,current_user)",
    )
  ).rows[0];
  const last =
    (
      await db.query(
        "SELECT status,started_at,finished_at,detail FROM operation_runs WHERE kind='backup' ORDER BY started_at DESC LIMIT 1",
      )
    ).rows[0] || null;
  const plans = Number(
    (
      await db.query(
        "SELECT count(*) count FROM plans WHERE published AND active AND id NOT LIKE 'qa-%'",
      )
    ).rows[0].count,
  );
  const checks = [
    {
      id: "database",
      name: "Credencial PostgreSQL exclusiva e sem privilégios administrativos",
      ok: role?.elevated === false,
    },
    {
      id: "mail",
      name: "Envio SMTP configurado (não comprova entrega)",
      ok: process.env.MAIL_TRANSPORT === "smtp" && mailReady(),
    },
    {
      id: "verification",
      name: "Verificação de e-mail habilitada",
      ok: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
    },
    {
      id: "identity",
      name: "Operador e contato de suporte informados",
      ok: !!process.env.OPERATOR_LEGAL_NAME && !!process.env.SUPPORT_EMAIL,
    },
    { id: "plans", name: "Planos e preços publicados", ok: plans > 0 },
    {
      id: "backup_config",
      name: "Backup externo habilitado e configurado",
      ok:
        process.env.BACKUP_ENABLED === "true" &&
        !!process.env.BACKUP_UPLOAD_PREFIX &&
        !!process.env.BACKUP_UPLOAD_AUTH &&
        !!process.env.BACKUP_RETENTION_DAYS &&
        (process.env.BACKUP_ENCRYPTION_KEY?.length || 0) >= 32,
    },
    {
      id: "backup_recent",
      name: "Última cópia externa confirmada nas últimas 48 horas",
      ok:
        last?.status === "success" &&
        !!last.finished_at &&
        +new Date(last.finished_at) > Date.now() - 48 * 3600000,
    },
  ];
  return {
    mode: process.env.DEMO_MODE === "true" ? "demo" : "commercial",
    commercialReady: checks.every((c) => c.ok),
    checks,
    lastBackup: last,
    physicalDeviceTests:
      "Verificação manual em Android, iPhone e Smart TV ainda necessária.",
  };
}
export async function assertProductionReadiness() {
  if (process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true")
    return;
  const state = await operationReadiness();
  if (!state.commercialReady)
    throw new HttpError(
      "O cadastro comercial ainda está em preparação. Tente novamente mais tarde.",
      503,
    );
}

export async function assertDatabaseScope() {
  if (process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true")
    return;
  const role = (
    await db.query(
      "SELECT bool_or(rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls) elevated FROM pg_roles WHERE rolname IN (session_user,current_user)",
    )
  ).rows[0];
  if (role?.elevated !== false)
    throw Error(
      "Configure uma conexão PostgreSQL exclusiva e sem privilégios administrativos antes de iniciar a operação comercial.",
    );
}
