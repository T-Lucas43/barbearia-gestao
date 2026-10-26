import { requireSession } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { errorResponse } from "@/lib/http";
import { buildInAppNotices } from "@/lib/in-app-notices";
import { whatsappPhone } from "@/lib/manual-whatsapp";
export async function GET() {
  try {
    const s = await requireSession();
    const pid = s.role === "barber" ? s.professional_id : null;
    const result = await transaction(async (c) => {
      await c.query(
        "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );
      const base =
        "SELECT a.id,a.schedule_version,a.customer,a.phone,a.starts_at,p.name professional_name,COALESCE(a.service_name_snapshot,se.name) service_name FROM appointments a JOIN professionals p ON p.id=a.professional_id AND p.tenant_id=a.tenant_id JOIN services se ON se.id=a.service_id AND se.tenant_id=a.tenant_id JOIN tenants t ON t.id=a.tenant_id LEFT JOIN manual_reminder_tasks m ON m.appointment_id=a.id AND m.tenant_id=a.tenant_id AND m.schedule_version=a.schedule_version WHERE a.tenant_id=$1 AND ($2::text IS NULL OR a.professional_id=$2) AND a.source='booking' AND a.status IN ('scheduled','confirmed') AND a.starts_at>now() ";
      const soon = (
        await c.query(
          base +
            "AND a.starts_at<=now()+interval '10 minutes' ORDER BY a.starts_at LIMIT 20",
          [s.tenant_id, pid],
        )
      ).rows;
      const reminders = (
        await c.query(
          base +
            "AND a.consent=true AND a.phone<>'' AND m.state IS DISTINCT FROM 'done' AND (a.starts_at-(t.reminder_minutes*interval '1 minute')<=now() OR m.requested_at IS NOT NULL) " +
            (s.role === "barber" ? "AND m.requested_at IS NULL " : "") +
            "ORDER BY a.starts_at LIMIT 200",
          [s.tenant_id, pid],
        )
      ).rows;
      return {
        soon,
        reminders: reminders.filter((a) => whatsappPhone(a.phone)),
      };
    });
    return Response.json(
      {
        items: buildInAppNotices(result.soon, result.reminders, s.role),
        intervalSeconds: 30,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
