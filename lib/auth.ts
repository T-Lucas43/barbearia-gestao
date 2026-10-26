import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { db } from "./db";
import { auth } from "./auth-engine";
import { HttpError } from "./http";
import { assertSubscription } from "./subscription";
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function sameOrigin(request: Request) {
  try {
    const origin = new URL(request.headers.get("origin") || "");
    const allowed = (process.env.APP_ORIGINS || process.env.APP_URL || "")
      .split(",")
      .filter(Boolean);
    return allowed.length
      ? allowed.some((value) => new URL(value).origin === origin.origin)
      : origin.host === request.headers.get("host");
  } catch {
    return false;
  }
}
export type Session = {
  user_id: string;
  name: string;
  tenant_id: string;
  role: "owner" | "receptionist" | "barber";
  professional_id: string | null;
  read_only: boolean;
  is_demo: boolean;
};
export async function session(): Promise<Session | null> {
  const authenticated = await auth.api.getSession({ headers: await headers() });
  if (!authenticated) return null;
  const member = (
    await db.query(
      "SELECT user_id,tenant_id,role,professional_id,read_only,is_demo FROM memberships WHERE user_id=$1 AND active=true",
      [authenticated.user.id],
    )
  ).rows[0];
  if (member?.is_demo && process.env.DEMO_MODE !== "true") return null;
  return member ? { ...member, name: authenticated.user.name } : null;
}
export async function requireSession(
  roles: Session["role"][] = ["owner", "receptionist", "barber"],
  write = false,
) {
  const s = await session();
  if (!s) throw new HttpError("Entre para continuar.", 401);
  if (!roles.includes(s.role))
    throw new HttpError(
      "Seu perfil não tem permissão para esta operação.",
      403,
    );
  if (write && s.read_only)
    throw new HttpError(
      "A demonstração permite consultar os dados. Entre com uma conta administrativa para salvar alterações.",
      403,
    );
  if (write) await assertSubscription(s.tenant_id);
  return s;
}
export function requireOrigin(request: Request) {
  if (!sameOrigin(request)) throw new HttpError("Origem inválida.", 403);
}
