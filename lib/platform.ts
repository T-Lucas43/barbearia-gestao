import { headers } from "next/headers";
import { auth } from "./auth-engine";
import { db } from "./db";
import { HttpError } from "./http";
export async function requirePlatformAdmin() {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) throw new HttpError("Entre com sua conta administrativa.", 401);
  const a = (
    await db.query(
      "SELECT p.user_id FROM platform_admins p WHERE p.user_id=$1 AND p.active AND NOT EXISTS(SELECT 1 FROM memberships m WHERE m.user_id=p.user_id AND m.is_demo)",
      [s.user.id],
    )
  ).rows[0];
  if (!a)
    throw new HttpError("Acesso exclusivo à administração da plataforma.", 403);
  if (process.env.NODE_ENV === "production" && !s.user.twoFactorEnabled)
    throw new HttpError(
      "Ative o segundo fator em Minha conta antes de administrar a plataforma.",
      403,
    );
  return s.user;
}
