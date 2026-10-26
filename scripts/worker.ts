import "dotenv/config";
import { processNotifications } from "../lib/notification-worker";
import { db } from "../lib/db";
import { processScheduledBackup } from "../lib/backup";
let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try {
    await processNotifications();
    await processScheduledBackup();
  } catch (e) {
    console.error(JSON.stringify({ event: "worker_iteration_failed" }));
  } finally {
    busy = false;
  }
}
await tick();
const timer = setInterval(() => void tick(), 10000);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, async () => {
    clearInterval(timer);
    await db.end();
    process.exit(0);
  });
console.log(
  process.env.WHATSAPP_ENABLED === "true" && process.env.DEMO_MODE !== "true"
    ? "Worker de WhatsApp real iniciado."
    : "Worker iniciado em modo simulado. Nenhuma mensagem real será enviada.",
);
