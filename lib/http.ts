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
  const headers = { "Cache-Control": "private, no-store" };
  if (error instanceof z.ZodError)
    return Response.json(
      {
        error: "Confira os dados informados.",
        details: error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400, headers },
    );
  if (error instanceof HttpError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers },
    );
  const e = error as { code?: string };
  if (e.code === "23P01")
    return Response.json(
      {
        error:
          "O profissional está ocupado ou bloqueado neste intervalo. Escolha outro horário.",
      },
      { status: 409, headers },
    );
  if (e.code === "23505")
    return Response.json(
      { error: "Este registro já existe." },
      { status: 409, headers },
    );
  if (e.code === "23503" || e.code === "23514" || e.code === "22003")
    return Response.json(
      {
        error: "Não foi possível salvar. Verifique os dados e tente novamente.",
      },
      { status: 400, headers },
    );
  const incident = crypto.randomUUID();
  console.error(
    JSON.stringify({
      event: "request_failed",
      incident,
      code: /^[A-Z0-9_]{2,20}$/.test(e.code || "") ? e.code : "INTERNAL",
    }),
  );
  return Response.json(
    {
      error: "Não foi possível concluir a operação. Tente novamente.",
      reference: incident,
    },
    {
      status: /^(ECONN|ETIMEDOUT|57P|53300|08)/.test(e.code || "") ? 503 : 500,
      headers,
    },
  );
}
export async function readJson(
  request: Request,
  maxBytes = 65536,
): Promise<any> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new HttpError("Envie os dados em JSON.", 415);
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new HttpError("Conteúdo muito grande.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError("Informe os dados da operação.");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "";
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError("Conteúdo muito grande.", 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError("JSON inválido.");
  }
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
