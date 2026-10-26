import { session } from "@/lib/auth";
import { db } from "@/lib/db";
import { localDay } from "@/lib/domain";
export async function GET() {
  const auth = await session();
  if (!auth)
    return Response.json(
      { error: "Entre com o perfil do proprietário para abrir a TV." },
      { status: 401 },
    );
  if (auth.role !== "owner")
    return Response.json(
      { error: "Acesso reservado ao proprietário." },
      { status: 403 },
    );
  const [team, bookings] = await Promise.all([
    db.query(
      "SELECT id,name,color,specialty FROM professionals WHERE tenant_id=$1 ORDER BY name",
      [auth.tenant_id],
    ),
    db.query(
      "SELECT a.id,a.professional_id,a.customer,a.starts_at,a.ends_at,a.status,s.name service_name FROM appointments a JOIN services s ON s.id=a.service_id AND s.tenant_id=a.tenant_id WHERE a.tenant_id=$1 AND a.starts_at>=($2::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND a.starts_at<now()+interval '7 days' AND a.status NOT IN ('cancelled','no_show') ORDER BY a.starts_at",
      [auth.tenant_id, localDay()],
    ),
  ]);
  return Response.json(
    {
      professionals: team.rows,
      appointments: bookings.rows.map((a) => {
        const names = a.customer.trim().split(/\s+/);
        return {
          ...a,
          customer:
            names[0] + (names.length > 1 ? ` ${names.at(-1)![0]}.` : ""),
        };
      }),
      updatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
