import { createHash } from "node:crypto";
import { db } from "./db";
import type { PoolClient } from "pg";
import { z } from "zod";
import { encryptToken, decryptToken } from "./secure-token";
export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function errorResponse(error: unknown) {
  if (error instanceof z.ZodError)
    return Response.json(
      {
        error: "Confira os dados informados.",
        details: error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  const e = error as Error & { code?: string; status?: number };
  if (e.code === "23P01")
    return Response.json(
      {
        error:
          "O profissional está ocupado ou bloqueado neste intervalo. Escolha outro horário.",
      },
      { status: 409 },
    );
  if (e.code === "23505")
    return Response.json(
      { error: "Este registro já existe." },
      { status: 409 },
    );
  if (e.code)
    return Response.json(
      {
        error: "Não foi possível salvar. Verifique os dados e tente novamente.",
      },
      { status: 400 },
    );
  return Response.json(
    { error: e.message || "Não foi possível concluir a operação." },
    { status: e.status || 400 },
  );
}
export async function rateLimit(key: string, max = 20, seconds = 900) {
  const hashed = createHash("sha256").update(key).digest("hex");
  const r = await db.query(
    "INSERT INTO rate_limits(key,window_start,count) VALUES ($1,now(),1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.window_start<now()-($2*interval '1 second') THEN 1 ELSE rate_limits.count+1 END,window_start=CASE WHEN rate_limits.window_start<now()-($2*interval '1 second') THEN now() ELSE rate_limits.window_start END RETURNING count",
    [hashed, seconds],
  );
  if (r.rows[0].count > max)
    throw new HttpError(
      "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      429,
    );
}
export async function idempotent<T>(
  c: PoolClient,
  tenant: string,
  key: string,
  body: unknown,
  fn: () => Promise<T>,
): Promise<T> {
  z.uuid().parse(key);
  const hash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [tenant + key]);
  const existing = (
    await c.query(
      "SELECT * FROM request_records WHERE tenant_id=$1 AND idempotency_key=$2",
      [tenant, key],
    )
  ).rows[0];
  if (existing) {
    if (existing.payload_hash !== hash)
      throw new HttpError(
        "A chave desta operação já foi usada com outros dados.",
        409,
      );
    if (existing.encrypted_response)
      return JSON.parse(decryptToken(existing.encrypted_response)) as T;
    if (
      typeof body === "object" &&
      body &&
      "action" in body &&
      body.action === "book" &&
      existing.response?.id
    ) {
      const a = (
        await c.query(
          "SELECT manage_cipher FROM appointments WHERE id=$1 AND tenant_id=$2",
          [existing.response.id, tenant],
        )
      ).rows[0];
      if (a?.manage_cipher)
        return {
          ...existing.response,
          manageToken: decryptToken(a.manage_cipher),
        } as T;
    }
    return existing.response as T;
  }
  const result = await fn();
  await c.query(
    "INSERT INTO request_records(tenant_id,idempotency_key,payload_hash,response,encrypted_response) VALUES ($1,$2,$3,'{}'::jsonb,$4)",
    [tenant, key, hash, encryptToken(JSON.stringify(result))],
  );
  return result;
}
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      Number.isFinite(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Data inválida",
  );
export const amountSchema = z.number().int().min(0).max(100000000);
export const methodSchema = z.enum(["Pix", "Dinheiro", "Cartão"]);
