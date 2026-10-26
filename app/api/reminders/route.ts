import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/http";
import { localDay } from "@/lib/domain";
import { addDays } from "@/lib/calendar";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const s = await requireSession();
    const params = new URL(request.url).searchParams;
    const period = z
      .enum(["today", "tomorrow", "week"])
      .parse(params.get("period") || "week");
    const requested = z
      .string()
      .max(128)
      .parse(params.get("professionalId") || "");
    if (s.role === "barber" && requested && requested !== s.professional_id)
      throw new HttpError(
        "Você pode consultar apenas seus próprios lembretes.",
        403,
      );
    const professional =
      s.role === "barber" ? s.professional_id : requested || null;
    const today = localDay();
    const start = period === "tomorrow" ? addDays(today, 1) : today;
    const end = addDays(start, period === "week" ? 7 : 1);
    const appointments = (
      await db.query(
        "SELECT a.id,a.customer,a.phone,a.professional_id,a.starts_at,a.consent,p.name professional_name,COALESCE(a.service_name_snapshot,se.name) service_name,(a.starts_at - (t.reminder_minutes * interval '1 minute') <= now()) due FROM appointments a JOIN professionals p ON p.id=a.professional_id AND p.tenant_id=a.tenant_id JOIN services se ON se.id=a.service_id AND se.tenant_id=a.tenant_id JOIN tenants t ON t.id=a.tenant_id WHERE a.tenant_id=$1 AND ($2::text IS NULL OR a.professional_id=$2) AND a.status IN ('scheduled','confirmed') AND a.source='booking' AND a.starts_at>now() AND a.starts_at>=($3::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND a.starts_at<($4::date::timestamp AT TIME ZONE 'America/Sao_Paulo') ORDER BY a.starts_at,a.id LIMIT 200",
        [s.tenant_id, professional, start, end],
      )
    ).rows;
    return Response.json(
      { appointments, start, end },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
