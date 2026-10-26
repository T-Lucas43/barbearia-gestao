import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/http";
import { localDay } from "@/lib/domain";
import { addDays } from "@/lib/calendar";
export async function GET(request: Request) {
  try {
    const s = await requireSession(["owner", "barber"]);
    const requested = new URL(request.url).searchParams.get("professionalId");
    if (s.role === "barber" && requested && requested !== s.professional_id)
      throw new HttpError("Sem permissão.", 403);
    const professional =
      s.role === "barber" ? s.professional_id : requested || s.professional_id;
    if (!professional) throw new HttpError("Escolha um profissional.");
    const day = localDay(),
      end = addDays(day, 31);
    const rows = (
      await db.query(
        "SELECT a.id,a.professional_id,a.service_id,a.customer,a.phone,a.source,a.status,a.starts_at,a.ends_at,a.completed_at,a.price,a.paid,a.commission,p.name professional_name,p.color,COALESCE(a.service_name_snapshot,se.name) service_name FROM appointments a JOIN professionals p ON p.id=a.professional_id AND p.tenant_id=a.tenant_id JOIN services se ON se.id=a.service_id AND se.tenant_id=a.tenant_id WHERE a.tenant_id=$1 AND a.professional_id=$2 AND (a.status='in_progress' OR (a.starts_at>=($3::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND a.starts_at<($4::date::timestamp AT TIME ZONE 'America/Sao_Paulo')) OR (a.completed_at>=($3::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND a.completed_at<(($3::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo'))) ORDER BY a.starts_at LIMIT 150",
        [s.tenant_id, professional, day, end],
      )
    ).rows;
    return Response.json(
      { appointments: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
