import "dotenv/config";
import { assertDatabaseScope, operationReadiness } from "../lib/operations";
import { processScheduledBackup } from "../lib/backup";
import { db } from "../lib/db";
try {
  await assertDatabaseScope();
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true")
    await processScheduledBackup();
  const state = await operationReadiness();
  console.log(
    JSON.stringify({
      event: "preflight",
      mode: state.mode,
      commercialReady: state.commercialReady,
      pending: state.checks.filter((c) => !c.ok).map((c) => c.id),
    }),
  );
} finally {
  await db.end();
}
