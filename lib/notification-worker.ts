import { randomUUID } from "node:crypto";
import { db } from "./db";
import { DeliveryError, sendWhatsApp, type NotificationData } from "./whatsapp";
export async function processNotifications(limit = 10) {
  await db.query(
    "UPDATE notifications SET status='unknown',last_error='Processamento interrompido. Conciliar com o provedor antes de reenviar.',updated_at=now() WHERE status='processing' AND lease_until<now()",
  );
  for (let i = 0; i < limit; i++) {
    const lease = randomUUID();
    const task = (
      await db.query(
        "WITH candidate AS (SELECT id FROM notifications WHERE status IN ('pending','retry') AND due_at<=now() ORDER BY due_at FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE notifications n SET status='processing',attempts=n.attempts+1,lease_token=$1,lease_until=now()+interval '45 seconds',updated_at=now() FROM candidate WHERE n.id=candidate.id RETURNING n.*",
        [lease],
      )
    ).rows[0];
    if (!task) break;
    const a = (
      await db.query(
        "SELECT a.*,p.name professional_name,COALESCE(a.service_name_snapshot,s.name) service_name,t.slug FROM appointments a JOIN professionals p ON p.id=a.professional_id JOIN services s ON s.id=a.service_id JOIN tenants t ON t.id=a.tenant_id WHERE a.id=$1",
        [task.appointment_id],
      )
    ).rows[0];
    const invalid =
      !a ||
      !a.consent ||
      a.schedule_version !== task.version ||
      (task.kind === "cancellation"
        ? a.status !== "cancelled"
        : ["completed", "cancelled", "no_show"].includes(a.status)) ||
      (task.kind === "reminder" && +new Date(a.starts_at) <= Date.now());
    if (invalid) {
      await db.query(
        "UPDATE notifications SET status='cancelled',lease_until=NULL,updated_at=now() WHERE id=$1 AND lease_token=$2",
        [task.id, lease],
      );
      continue;
    }
    if (
      process.env.WHATSAPP_ENABLED !== "true" ||
      process.env.DEMO_MODE === "true"
    ) {
      await db.query(
        "UPDATE notifications SET status='simulated',lease_until=NULL,updated_at=now() WHERE id=$1 AND lease_token=$2",
        [task.id, lease],
      );
      continue;
    }
    try {
      const payload: NotificationData = {
        ...a,
        id: task.id,
        appointment_id: a.id,
        kind: task.kind,
        starts_at: new Date(a.starts_at).toISOString(),
      };
      const providerId = await sendWhatsApp(payload);
      await db.query(
        "UPDATE notifications SET status=CASE WHEN status IN ('delivered','read') THEN status ELSE 'sent' END,provider_message_id=$3,lease_until=NULL,last_error=NULL,updated_at=now() WHERE id=$1 AND lease_token=$2",
        [task.id, lease, providerId],
      );
    } catch (error) {
      const e =
        error instanceof DeliveryError
          ? error
          : new DeliveryError(
              "Falha interna no envio: conciliação necessária.",
              false,
              true,
            );
      const status = e.uncertain
        ? "unknown"
        : e.retryable && task.attempts < 5
          ? "retry"
          : "failed";
      await db.query(
        "UPDATE notifications SET status=$3,last_error=$4,lease_until=NULL,due_at=CASE WHEN $3='retry' THEN now()+($5*interval '1 second') ELSE due_at END,updated_at=now() WHERE id=$1 AND lease_token=$2",
        [
          task.id,
          lease,
          status,
          e.message,
          Math.min(3600, 60 * 2 ** (task.attempts - 1)),
        ],
      );
    }
  }
}
