import { session } from "@/lib/auth";
import { db } from "@/lib/db";
export async function GET(request: Request) {
  const auth = await session();
  if (!auth)
    return Response.json({ error: "Entre para continuar" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const start = params.get("start") || "";
  const end = params.get("end") || "";
  const valid = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  const span = (Date.parse(end) - Date.parse(start)) / 86400000;
  if (!valid(start) || !valid(end) || span < 1 || span > 42)
    return Response.json(
      { error: "Período inválido (máximo de 42 dias)" },
      { status: 400 },
    );
  const { rows } = await db.query(
    "SELECT a.*,p.name professional_name,p.color,s.name service_name FROM appointments a JOIN professionals p ON p.id=a.professional_id AND p.tenant_id=a.tenant_id JOIN services s ON s.id=a.service_id AND s.tenant_id=a.tenant_id WHERE a.tenant_id=$1 AND a.starts_at>=($2::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND a.starts_at<($3::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND ($4::text IS NULL OR a.professional_id=$4) ORDER BY a.starts_at",
    [
      auth.tenant_id,
      start,
      end,
      auth.role === "barber" ? auth.professional_id : null,
    ],
  );
  return Response.json({ appointments: rows });
}
