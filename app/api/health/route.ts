import { db } from "@/lib/db";
export async function GET() {
  try {
    await db.query("SELECT 1");
    return Response.json(
      {
        status: "ready",
        database: "postgresql",
        release: process.env.RELEASE_SHA || "local",
        demo: process.env.DEMO_MODE === "true",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
