import { requireSession } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { serviceFor } from "@/lib/availability";
import { errorResponse, HttpError } from "@/lib/http";
export async function GET(request: Request) {
  try {
    const s = await requireSession();
    const professional = new URL(request.url).searchParams.get(
      "professionalId",
    );
    if (!professional) throw new HttpError("Escolha um profissional.");
    if (s.role === "barber" && s.professional_id !== professional)
      throw new HttpError("Sem permissão.", 403);
    const services = await transaction(async (c) => {
      const ids = (
        await c.query(
          "SELECT id FROM services WHERE tenant_id=$1 AND active ORDER BY name",
          [s.tenant_id],
        )
      ).rows;
      const result = [];
      for (const row of ids) {
        try {
          const v = await serviceFor(c, s.tenant_id, professional, row.id);
          result.push({
            id: v.id,
            name: v.name,
            price: v.actual_price,
            duration: v.actual_duration,
          });
        } catch (e) {
          if (!(e instanceof HttpError)) throw e;
        }
      }
      return result;
    });
    return Response.json(
      { services },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
