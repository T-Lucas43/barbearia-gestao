import { readJson } from "@/lib/http";
import { requireSession, requireOrigin } from "@/lib/auth";
import { db, transaction } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/http";
import { audit } from "@/lib/finance";
import { z } from "zod";
export async function GET() {
  try {
    const s = await requireSession(["owner", "barber"]);
    if (!s.professional_id)
      throw new HttpError(
        "Seu acesso ainda não está vinculado a um profissional.",
        404,
      );
    const p = (
      await db.query(
        "SELECT id,name,specialty,color,commission_bps,commission_kind,commission_fixed FROM professionals WHERE tenant_id=$1 AND id=$2",
        [s.tenant_id, s.professional_id],
      )
    ).rows[0];
    if (!p) throw new HttpError("Profissional não encontrado.", 404);
    const schedules = (
      await db.query(
        "SELECT weekday,enabled,start_minute,end_minute,break_start,break_end FROM working_schedules WHERE tenant_id=$1 AND professional_id=$2 ORDER BY weekday",
        [s.tenant_id, s.professional_id],
      )
    ).rows;
    return Response.json(
      { professional: p, schedules },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const s = await requireSession(["owner", "barber"], true);
    if (!s.professional_id)
      throw new HttpError(
        "Seu acesso ainda não está vinculado a um profissional.",
        404,
      );
    const d = z
      .object({
        name: z.string().trim().min(2).max(80),
        specialty: z.string().trim().max(160),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      })
      .strict()
      .parse(await readJson(request));
    await transaction(async (c) => {
      await c.query("SELECT set_config('app.user_id',$1,true)", [s.user_id]);
      await c.query(
        "UPDATE professionals SET name=$1,specialty=$2,color=$3 WHERE tenant_id=$4 AND id=$5",
        [d.name, d.specialty, d.color, s.tenant_id, s.professional_id],
      );
      await audit(c, s.tenant_id, "own_profile", s.professional_id!);
    });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
