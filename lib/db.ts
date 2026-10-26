import "dotenv/config";
import { Pool, type PoolClient } from "pg";
const globalDb = globalThis as unknown as { pool?: Pool };
export const db =
  globalDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Math.max(1, Math.min(10, Number(process.env.DATABASE_POOL_SIZE) || 5)),
    connectionTimeoutMillis: 4000,
    idleTimeoutMillis: 15000,
    statement_timeout: 8000,
  });
if (process.env.NODE_ENV !== "production") globalDb.pool = db;
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
