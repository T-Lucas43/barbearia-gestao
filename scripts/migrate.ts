import { readFile, readdir } from "node:fs/promises";
import { db, transaction } from "../lib/db";
export async function migrate() {
  await db.query(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
  await transaction(async (c) => {
    await c.query(
      "SELECT pg_advisory_xact_lock(hashtext('barber-migrations'))",
    );
    await c.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const name of (
      await readdir(new URL("./migrations/", import.meta.url))
    )
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      if (
        (
          await c.query("SELECT name FROM schema_migrations WHERE name=$1", [
            name,
          ])
        ).rowCount
      )
        continue;
      await c.query(
        await readFile(
          new URL("./migrations/" + name, import.meta.url),
          "utf8",
        ),
      );
      await c.query("INSERT INTO schema_migrations(name) VALUES ($1)", [name]);
      console.log("Migração aplicada:", name);
    }
  });
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/migrate.ts")) {
  await migrate();
  await db.end();
}
