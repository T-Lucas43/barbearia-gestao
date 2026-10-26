import { requireSession } from "@/lib/auth";
import { db, transaction } from "@/lib/db";
import { z } from "zod";
import { errorResponse, HttpError, dateSchema } from "@/lib/http";
import { availableSlots } from "@/lib/availability";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const s = await requireSession();
    const id = z.uuid().parse((await params).id);
    const a = (
      await db.query(
        "SELECT a.*,p.name professional_name,COALESCE(a.service_name_snapshot,s.name) service_name,p.color FROM appointments a JOIN professionals p ON p.id=a.professional_id JOIN services s ON s.id=a.service_id WHERE a.id=$1 AND a.tenant_id=$2 AND ($3::text IS NULL OR a.professional_id=$3)",
        [id, s.tenant_id, s.role === "barber" ? s.professional_id : null],
      )
    ).rows[0];
    if (!a) throw new HttpError("Atendimento não encontrado.", 404);
    const payments = (
      await db.query(
        "SELECT * FROM payments WHERE appointment_id=$1 AND tenant_id=$2 ORDER BY created_at DESC",
        [id, s.tenant_id],
      )
    ).rows;
    const date = new URL(request.url).searchParams.get("date");
    const slots = date
      ? await transaction((c) =>
          availableSlots(
            c,
            s.tenant_id,
            dateSchema.parse(date),
            a.professional_id,
            a.service_id,
            a.id,
            (+new Date(a.ends_at) - +new Date(a.starts_at)) / 60000,
          ),
        )
      : [];
    delete a.manage_hash;
    delete a.manage_cipher;
    if (s.role === "receptionist") {
      delete a.commission;
      delete a.commission_bps;
      delete a.commission_fixed;
    }
    return Response.json(
      { appointment: a, payments, slots },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
