import { operationReadiness } from "@/lib/operations";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/http";
import { legalVersion, signupAvailable } from "@/lib/onboarding";
export async function GET() {
  try {
    const plans = (
      await db.query(
        "SELECT id,name,description,monthly_price,max_professionals FROM plans WHERE published AND active ORDER BY monthly_price",
      )
    ).rows;
    return Response.json(
      {
        plans,
        signupEnabled:
          signupAvailable() &&
          (process.env.NODE_ENV !== "production" ||
            (await operationReadiness()).commercialReady),
        legalVersion,
        manualBilling: true,
        supportEmail: process.env.SUPPORT_EMAIL || "",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
