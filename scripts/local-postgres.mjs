import "dotenv/config";
import { access, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";
const url = new URL(process.env.DATABASE_URL || "");
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.pathname !== "/barber"
)
  throw Error(
    "Este comando aceita apenas o banco local barber. Não usa a hospedagem.",
  );
const requireTool = createRequire(
  resolve("tmp/local-postgres-tools/package.json"),
);
let entry;
try {
  entry = requireTool.resolve("embedded-postgres");
} catch {
  throw Error(
    "Execute npm run db:local:install antes de iniciar o PostgreSQL local.",
  );
}
const { default: EmbeddedPostgres } = await import(pathToFileURL(entry).href);
// Keep persistent database files outside the application's development watcher.
const databaseDir = resolve(
  process.env.LOCALAPPDATA || resolve(homedir(), "AppData/Local"),
  "ElaresBarber",
  "postgres18",
);
await mkdir(databaseDir, { recursive: true });
const server = new EmbeddedPostgres({
  databaseDir,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: Number(url.port || 5547),
  persistent: true,
  authMethod: "scram-sha-256",
  createPostgresUser: false,
  postgresFlags: [
    "-h",
    "127.0.0.1",
    "-c",
    "max_connections=35",
    "-c",
    "shared_buffers=32MB",
  ],
  onLog: () => {},
  onError: () => {},
});
try {
  await access(resolve(databaseDir, "PG_VERSION"));
} catch {
  await server.initialise();
}
await server.start();
const client = server.getPgClient();
try {
  await client.connect();
  if (
    !(await client.query("SELECT 1 FROM pg_database WHERE datname='barber'"))
      .rowCount
  )
    await client.query("CREATE DATABASE barber");
} finally {
  await client.end();
}
console.log(
  "PostgreSQL local pronto em 127.0.0.1:" +
    url.port +
    ". Dados persistidos em AppData/Local/ElaresBarber/postgres18.",
);
let closing = false;
const stop = async () => {
  if (closing) return;
  closing = true;
  await server.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
await new Promise(() => {});
