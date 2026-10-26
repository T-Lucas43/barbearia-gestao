import { headers } from "next/headers";
import { auth } from "./auth-engine";
import { db } from "./db";
import { HttpError } from "./http";
export async function requireAccount() {
  const authenticated = await auth.api.getSession({ headers: await headers() });
  if (!authenticated) throw new HttpError("Entre para continuar.", 401);
  const membership = (
    await db.query(
      "SELECT active,is_demo,read_only FROM memberships WHERE user_id=$1",
      [authenticated.user.id],
    )
  ).rows[0];
  const platform = !!(
    await db.query(
      "SELECT 1 FROM platform_admins WHERE user_id=$1 AND active",
      [authenticated.user.id],
    )
  ).rowCount;
  if (
    (!membership?.active && !platform) ||
    (membership?.is_demo && process.env.DEMO_MODE !== "true")
  )
    throw new HttpError("Conta indisponível.", 401);
  return {
    authenticated,
    user_id: authenticated.user.id,
    name: authenticated.user.name,
    is_demo: !!membership?.is_demo,
    read_only: !!membership?.read_only,
    platform,
  };
}
