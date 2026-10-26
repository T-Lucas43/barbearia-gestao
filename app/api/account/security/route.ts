import { requireAccount } from "@/lib/account";
import { readJson } from "@/lib/http";
import { requireOrigin, requireSession } from "@/lib/auth";
import { auth } from "@/lib/auth-engine";
import { db } from "@/lib/db";
import { errorResponse, HttpError, rateLimit } from "@/lib/http";
import { headers } from "next/headers";
import { z } from "zod";
export async function GET() {
  try {
    const s = await requireAccount();
    if (s.is_demo)
      throw new HttpError("As contas de demonstração são compartilhadas.", 403);
    const current = await auth.api.getSession({ headers: await headers() });
    const user = (
      await db.query('SELECT "twoFactorEnabled" FROM auth_user WHERE id=$1', [
        s.user_id,
      ])
    ).rows[0];
    const sessions = (
      await db.query(
        'SELECT id,"createdAt","expiresAt","userAgent" FROM auth_session WHERE "userId"=$1 AND "expiresAt">now() ORDER BY "createdAt" DESC',
        [s.user_id],
      )
    ).rows.map((r) => ({ ...r, current: r.id === current?.session.id }));
    return Response.json(
      { enabled: !!user?.twoFactorEnabled, sessions },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const s = await requireAccount();
    if (s.is_demo || s.read_only)
      throw new HttpError("A demonstração não gerencia outros acessos.", 403);
    await rateLimit("sessions:" + s.user_id, 20, 60);
    const d = z
      .object({ id: z.string().min(1).max(100) })
      .strict()
      .parse(await readJson(request));
    const current = await auth.api.getSession({ headers: request.headers });
    if (d.id === current?.session.id)
      throw new HttpError("Use Sair da conta para encerrar este acesso.");
    const r = await db.query(
      'DELETE FROM auth_session WHERE id=$1 AND "userId"=$2',
      [d.id, s.user_id],
    );
    if (!r.rowCount) throw new HttpError("Acesso não encontrado.", 404);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
