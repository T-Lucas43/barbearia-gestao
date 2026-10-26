import "dotenv/config";
import { processNotifications } from "../lib/notification-worker";
import { db } from "../lib/db";
let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try {
    await processNotifications();
  } catch (e) {
    console.error("Falha no worker:", (e as Error).message);
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
