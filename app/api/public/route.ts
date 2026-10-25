import { db } from "@/lib/db";
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date");
  const [professionals, services, busy] = await Promise.all([
    db.query(
      "SELECT id,name,specialty,color FROM professionals WHERE tenant_id='demo'",
    ),
    db.query(
      "SELECT id,name,description,price,duration FROM services WHERE tenant_id='demo' ORDER BY price",
    ),
    date && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? db.query(
          "SELECT professional_id,starts_at,ends_at FROM appointments WHERE tenant_id='demo' AND status NOT IN ('cancelled','no_show') AND (starts_at AT TIME ZONE 'America/Sao_Paulo')::date=$1::date",
          [date],
        )
      : Promise.resolve({ rows: [] }),
  ]);
  return Response.json({
    professionals: professionals.rows,
    services: services.rows,
    busy: busy.rows,
  });
}
