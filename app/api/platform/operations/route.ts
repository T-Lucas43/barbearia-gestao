import { requirePlatformAdmin } from "@/lib/platform";
import { operationReadiness } from "@/lib/operations";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/http";
export async function GET() {
  try {
    await requirePlatformAdmin();
    const ready = await operationReadiness();
    const runs = (
      await db.query(
        "SELECT kind,status,started_at,finished_at,detail FROM operation_runs ORDER BY started_at DESC LIMIT 30",
      )
    ).rows;
    return Response.json(
      { ...ready, runs },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
