import type { PoolClient } from "pg";
export async function queueNotifications(
  c: PoolClient,
  appointmentId: string,
  kind = "confirmation",
) {
  const a = (
    await c.query(
      "SELECT a.*,t.reminder_minutes FROM appointments a JOIN tenants t ON t.id=a.tenant_id WHERE a.id=$1",
      [appointmentId],
    )
  ).rows[0];
  await c.query(
    "UPDATE notifications SET status='cancelled',updated_at=now() WHERE appointment_id=$1 AND status IN ('pending','retry')",
    [appointmentId],
  );
  if (!a?.consent) return;
  await c.query(
    "INSERT INTO notifications(appointment_id,kind,due_at,version) VALUES ($1,$2,now(),$3) ON CONFLICT DO NOTHING",
    [a.id, kind, a.schedule_version],
  );
  if (
    !["cancelled", "no_show", "completed"].includes(a.status) &&
    +new Date(a.starts_at) - a.reminder_minutes * 60000 > Date.now()
  )
    await c.query(
      "INSERT INTO notifications(appointment_id,kind,due_at,version) VALUES ($1,'reminder',$2,$3) ON CONFLICT DO NOTHING",
      [
        a.id,
        new Date(+new Date(a.starts_at) - a.reminder_minutes * 60000),
        a.schedule_version,
      ],
    );
}
