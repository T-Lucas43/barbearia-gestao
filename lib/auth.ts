import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { db } from "./db";
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function sameOrigin(request: Request) {
  try {
    return (
      new URL(request.headers.get("origin") || "").host ===
      request.headers.get("host")
    );
  } catch {
    return false;
  }
}
export async function session() {
  const token = (await cookies()).get("barber_session")?.value;
  if (!token) return null;
  const { rows } = await db.query(
    "SELECT tenant_id,role,professional_id FROM sessions WHERE token_hash=$1 AND expires_at>now()",
    [hash(token)],
  );
  return rows[0] as
    | { tenant_id: string; role: string; professional_id: string | null }
    | undefined;
}
