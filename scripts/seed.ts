import { readFile } from "node:fs/promises";
import { db, transaction } from "../lib/db";
import { localDay, commission } from "../lib/domain";
import { createHash } from "node:crypto";
await db.query(
  await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
);
await transaction(async (c) => {
  await c.query(
    "INSERT INTO tenants VALUES ('demo','Studio da Navalha','studio-da-navalha') ON CONFLICT DO NOTHING",
  );
  for (const p of [
    ["rafa", "Rafael Costa", "Cortes clássicos & degradê", "#d79e58", 4500],
    ["bruno", "Bruno Almeida", "Barba & visagismo", "#899f8e", 5000],
    ["leo", "Leonardo Santos", "Cortes modernos", "#9b8cbe", 4000],
  ])
    await c.query(
      "INSERT INTO professionals VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
      [p[0], "demo", ...p.slice(1)],
    );
  for (const s of [
    [
      "corte",
      "Corte masculino",
      "Seu estilo, com acabamento impecável.",
      6000,
      45,
    ],
    [
      "barba",
      "Barba completa",
      "Toalha quente e cuidado em cada detalhe.",
      4000,
      30,
    ],
    [
      "combo",
      "Corte + barba",
      "A experiência completa para renovar o visual.",
      9000,
      75,
    ],
    [
      "acabamento",
      "Acabamento",
      "Os pequenos detalhes fazem a diferença.",
      2500,
      15,
    ],
  ])
    await c.query(
      "INSERT INTO services VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
      [s[0], "demo", ...s.slice(1)],
    );
  const existing = await c.query("SELECT id FROM appointments LIMIT 1");
  if (!existing.rowCount) {
    const day = localDay();
    const rows = [
      ["rafa", "corte", "André Martins", "09:00", 45, 6000, 4500, "completed"],
      [
        "bruno",
        "combo",
        "Pedro Oliveira",
        "09:00",
        75,
        9000,
        5000,
        "completed",
      ],
      ["leo", "corte", "Matheus Silva", "10:00", 45, 6000, 4000, "completed"],
      ["rafa", "combo", "Lucas Ferreira", "11:00", 75, 9000, 4500, "confirmed"],
      ["bruno", "barba", "Gustavo Lima", "11:00", 30, 4000, 5000, "scheduled"],
      ["leo", "corte", "Felipe Rocha", "13:00", 45, 6000, 4000, "scheduled"],
      ["rafa", "corte", "Daniel Souza", "14:00", 45, 6000, 4500, "scheduled"],
      ["bruno", "combo", "Thiago Alves", "15:00", 75, 9000, 5000, "confirmed"],
    ];
    for (const [pid, sid, name, hour, duration, price, bps, status] of rows) {
      const start = new Date(`${day}T${hour}:00-03:00`);
      const end = new Date(+start + Number(duration) * 60000);
      await c.query(
        "INSERT INTO appointments(tenant_id,professional_id,service_id,customer,phone,starts_at,ends_at,price,commission_bps,commission,status,paid,payment_method,manage_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
        [
          "demo",
          pid,
          sid,
          name,
          "11999990000",
          start,
          end,
          price,
          bps,
          commission(Number(price), Number(bps)),
          status,
          status === "completed" ? price : 0,
          status === "completed" ? "Pix" : null,
          createHash("sha256").update(crypto.randomUUID()).digest("hex"),
        ],
      );
    }
    await c.query(
      "INSERT INTO expenses(tenant_id,description,amount) VALUES ('demo','Materiais e produtos',4500)",
    );
  }
});
console.log("Banco preparado com dados fictícios.");
await db.end();
