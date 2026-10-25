import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hash, sameOrigin } from "@/lib/auth";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Origem inválida" }, { status: 403 });
  const body = await request.json();
  const input = hash(String(body.password));
  const expected = hash(process.env.LOCAL_DEMO_PASSWORD || "demo-local-2026");
  if (!timingSafeEqual(Buffer.from(input), Buffer.from(expected)))
    return Response.json({ error: "Senha incorreta" }, { status: 401 });
  const role = body.profile === "rafa" ? "barber" : "owner";
  const token = randomBytes(32).toString("hex");
  await db.query(
    "INSERT INTO sessions VALUES ($1,'demo',$2,$3,now()+interval '12 hours')",
    [hash(token), role, role === "barber" ? "rafa" : null],
  );
  (await cookies()).set("barber_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 43200,
    path: "/",
  });
  return Response.json({ ok: true });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Origem inválida" }, { status: 403 });
  const jar = await cookies();
  const token = jar.get("barber_session")?.value;
  if (token)
    await db.query("DELETE FROM sessions WHERE token_hash=$1", [hash(token)]);
  jar.delete("barber_session");
  return Response.json({ ok: true });
}
