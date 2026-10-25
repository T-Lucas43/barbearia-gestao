import { db } from "../lib/db";
async function tick() {
  // Simulação explícita: não contata WhatsApp nem afirma entrega real.
  const result = await db.query(
    "UPDATE notifications n SET status=CASE WHEN a.status IN ('completed','cancelled','no_show') THEN 'cancelled' ELSE 'simulated' END, attempts=n.attempts+1 FROM appointments a WHERE a.id=n.appointment_id AND n.status='pending' AND n.due_at<=now() RETURNING n.id,n.status",
  );
  for (const row of result.rows)
    console.log("[WhatsApp simulado]", row.id, row.status);
}
await tick();
setInterval(() => {
  tick().catch(console.error);
}, 15000);
