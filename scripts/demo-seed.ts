import { randomUUID, randomBytes, createHash } from "node:crypto";
import { db, transaction } from "../lib/db";
import { localDay, commission } from "../lib/domain";
import { addDays } from "../lib/calendar";
import { instant } from "../lib/availability";
export async function seedDemo() {
  if (process.env.DEMO_MODE !== "true") return;
  const today = localDay();
  const names = [
    "André Martins",
    "Pedro Oliveira",
    "Matheus Silva",
    "Lucas Ferreira",
    "Gustavo Lima",
    "Felipe Rocha",
    "Daniel Souza",
    "Thiago Alves",
    "Gabriel Santos",
    "João Ribeiro",
    "Henrique Costa",
    "Vinícius Almeida",
    "Caio Barbosa",
    "Samuel Pereira",
    "Enzo Cardoso",
    "Arthur Nunes",
    "Davi Fernandes",
    "Miguel Araújo",
    "Rafael Mendes",
    "Bruno Teixeira",
  ];
  let created = 0;
  await transaction(async (c) => {
    const pros = (
      await c.query(
        "SELECT * FROM professionals WHERE tenant_id='demo' AND active ORDER BY id",
      )
    ).rows;
    const services = (
      await c.query(
        "SELECT * FROM services WHERE tenant_id='demo' AND active ORDER BY id",
      )
    ).rows;
    if (!pros.length || !services.length) return;
    for (let offset = -14; offset <= 6; offset++)
      for (let p = 0; p < pros.length; p++)
        for (let index = 0; index < 3; index++) {
          const pro = pros[p],
            service =
              services[(p + index + Math.abs(offset)) % services.length];
          const date = addDays(today, offset);
          const hour = ["09:00", "10:30", "14:00"][index];
          const start = instant(date, hour),
            end = new Date(+start + service.duration * 60000);
          const reference = `demo-v1:${date}:${pro.id}:${hour}`;
          if (
            (
              await c.query(
                "SELECT id FROM appointments WHERE demo_reference=$1",
                [reference],
              )
            ).rowCount
          )
            continue;
          if (
            (
              await c.query(
                "SELECT id FROM resource_slots WHERE professional_id=$1 AND tstzrange(starts_at,ends_at,'[)') && tstzrange($2::timestamptz,$3::timestamptz,'[)')",
                [pro.id, start, end],
              )
            ).rowCount
          )
            continue;
          const future = +start > Date.now();
          const code = Math.abs(offset * 7 + p * 3 + index);
          const status = future
            ? code % 2
              ? "scheduled"
              : "confirmed"
            : code % 17 === 0
              ? "cancelled"
              : code % 19 === 0
                ? "no_show"
                : "completed";
          const value = service.price;
          const share =
            pro.commission_kind === "fixed"
              ? Math.min(value, pro.commission_fixed)
              : commission(value, service.commission_bps ?? pro.commission_bps);
          const paid = status === "completed" ? value : 0;
          const method =
            code % 3 === 0 ? "Cartão" : code % 3 === 1 ? "Pix" : "Dinheiro";
          await c.query("SAVEPOINT demo_item");
          try {
            const a = (
              await c.query(
                "INSERT INTO appointments(tenant_id,professional_id,service_id,customer,phone,starts_at,ends_at,price,list_price,service_name_snapshot,commission_bps,commission_kind,commission_fixed,commission,status,paid,payment_method,manage_hash,manage_expires_at,completed_at,demo_reference) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id",
                [
                  "demo",
                  pro.id,
                  service.id,
                  names[(code + p) % names.length],
                  "1190000" + String(code % 10000).padStart(4, "0"),
                  start,
                  end,
                  value,
                  service.name,
                  service.commission_bps ?? pro.commission_bps,
                  pro.commission_kind,
                  pro.commission_fixed,
                  share,
                  status,
                  paid,
                  paid ? method : null,
                  createHash("sha256").update(randomBytes(32)).digest("hex"),
                  new Date(+start + 30 * 86400000),
                  status === "completed" ? end : null,
                  reference,
                ],
              )
            ).rows[0];
            if (paid)
              await c.query(
                "INSERT INTO payments(tenant_id,appointment_id,kind,service_amount,tip,fee,method,created_at,created_by) VALUES ('demo',$1,'receipt',$2,$3,$4,$5,$6,'demo-seed')",
                [
                  a.id,
                  paid,
                  code % 13 === 0 ? 500 : 0,
                  method === "Cartão" ? Math.round(value * 0.025) : 0,
                  method,
                  end,
                ],
              );
            await c.query("RELEASE SAVEPOINT demo_item");
            created++;
          } catch (e) {
            await c.query("ROLLBACK TO SAVEPOINT demo_item");
            if ((e as { code?: string }).code !== "23P01") throw e;
          }
        }
    for (const offset of [-12, -8, -4]) {
      const date = addDays(today, offset);
      const ref = "expense-demo-v1:" + date;
      await c.query(
        "INSERT INTO expenses(tenant_id,description,amount,method,paid_at,demo_reference) VALUES ('demo',$1,$2,'Pix',$3,$4) ON CONFLICT DO NOTHING",
        [
          offset === -12
            ? "Reposição de produtos (fictício)"
            : offset === -8
              ? "Internet e energia (fictício)"
              : "Material de limpeza (fictício)",
          offset === -12 ? 18500 : offset === -8 ? 24000 : 6500,
          instant(date, "18:00"),
          ref,
        ],
      );
    }
  });
  console.log("Demonstração: novos atendimentos fictícios inseridos:", created);
}
