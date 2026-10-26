import "dotenv/config";
import { spawn, spawnSync } from "node:child_process";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { createReadStream, createWriteStream, openAsBlob } from "node:fs";
import { open, mkdir, rename, unlink, readdir, stat } from "node:fs/promises";
import { resolve, join, basename, dirname } from "node:path";
import { pipeline } from "node:stream/promises";
import { db } from "./db";
export function pgClientTool(name: string) {
  return join(
    process.env.PG_BIN_DIR || resolve("tmp/pg-client/bin"),
    name + (process.platform === "win32" ? ".exe" : ""),
  );
}
function connectionEnv(urlString = process.env.DATABASE_URL!) {
  const u = new URL(urlString);
  return {
    ...process.env,
    PGHOST: u.hostname,
    PGPORT: u.port || "5432",
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: decodeURIComponent(u.pathname.slice(1)),
    ...(u.searchParams.get("options")
      ? { PGOPTIONS: u.searchParams.get("options")! }
      : {}),
    ...(u.searchParams.get("sslmode")
      ? { PGSSLMODE: u.searchParams.get("sslmode")! }
      : {}),
  };
}
function encryptionKey() {
  const secret = process.env.BACKUP_ENCRYPTION_KEY;
  if (!secret || secret.length < 32)
    throw Error(
      "Configure a chave de backup e guarde uma cópia fora do servidor.",
    );
  return createHash("sha256").update(secret).digest();
}
export async function createEncryptedBackup() {
  const directory = resolve(process.env.BACKUP_DIRECTORY || "backups");
  await mkdir(directory, { recursive: true });
  const name =
    "elares-" +
    new Date().toISOString().replace(/[:.]/g, "-") +
    "-" +
    randomBytes(6).toString("hex") +
    ".backup.enc";
  const final = join(directory, name),
    temporary = final + ".partial",
    iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const file = await open(temporary, "wx", 0o600);
  await file.write(
    Buffer.concat([Buffer.from("NAVALHA1"), iv, Buffer.alloc(16)]),
  );
  await file.close();
  const child = spawn(
    pgClientTool("pg_dump"),
    ["--format=custom", "--no-owner", "--no-acl"],
    {
      env: connectionEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  child.stderr.on("data", () => {});
  const exit = new Promise<void>((ok, fail) => {
    child.once("error", () =>
      fail(Error("Cliente pg_dump indisponível. Configure PG_BIN_DIR.")),
    );
    child.once("close", (code) =>
      code === 0
        ? ok()
        : fail(Error("O PostgreSQL não confirmou a criação do backup.")),
    );
  });
  try {
    await Promise.all([
      pipeline(
        child.stdout,
        cipher,
        createWriteStream(temporary, { flags: "r+", start: 36 }),
      ),
      exit,
    ]);
    const completed = await open(temporary, "r+");
    try {
      await completed.write(cipher.getAuthTag(), 0, 16, 20);
      await completed.sync();
    } finally {
      await completed.close();
    }
    await rename(temporary, final);
    return final;
  } catch (e) {
    child.kill();
    await unlink(temporary).catch(() => {});
    throw e;
  }
}
export async function decryptBackup(input: string, output: string) {
  const file = await open(input, "r");
  const header = Buffer.alloc(36);
  try {
    const r = await file.read(header, 0, 36, 0);
    if (r.bytesRead !== 36 || header.subarray(0, 8).toString() !== "NAVALHA1")
      throw Error("Formato de backup inválido.");
  } finally {
    await file.close();
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    header.subarray(8, 20),
  );
  decipher.setAuthTag(header.subarray(20, 36));
  try {
    await pipeline(
      createReadStream(input, { start: 36 }),
      decipher,
      createWriteStream(output, { flags: "wx", mode: 0o600 }),
    );
  } catch {
    await unlink(output).catch(() => {});
    throw Error("O backup não passou na verificação de integridade e chave.");
  }
}
export async function uploadBackup(path: string) {
  const prefix = new URL(process.env.BACKUP_UPLOAD_PREFIX || "");
  if (
    prefix.protocol !== "https:" ||
    prefix.username ||
    prefix.password ||
    prefix.search ||
    prefix.hash
  )
    throw Error(
      "Configure um destino HTTPS de backup, sem credenciais na URL.",
    );
  if (!process.env.BACKUP_UPLOAD_AUTH)
    throw Error("Configure a autorização do destino externo.");
  if (!prefix.pathname.endsWith("/")) prefix.pathname += "/";
  const target = new URL(encodeURIComponent(basename(path)), prefix);
  const response = await fetch(target, {
    method: "PUT",
    headers: {
      Authorization: process.env.BACKUP_UPLOAD_AUTH,
      "Content-Type": "application/octet-stream",
    },
    body: await openAsBlob(path),
    redirect: "error",
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok)
    throw Error("O destino externo não confirmou o recebimento do backup.");
}
export async function applyBackupRetention(directory: string, days: number) {
  const root = resolve(directory);
  if (!Number.isInteger(days) || days < 7 || days > 365)
    throw Error("Retenção deve estar entre 7 e 365 dias.");
  const files = [];
  for (const name of await readdir(root)) {
    if (
      !/^elares-\d{4}-\d{2}-\d{2}T[\dTZ-]+-[a-f0-9]{12}\.backup\.enc$/.test(
        name,
      )
    )
      continue;
    const path = resolve(root, name);
    if (dirname(path) !== root) throw Error("Backup fora do diretório.");
    const s = await stat(path);
    if (s.isFile()) files.push({ path, time: s.mtimeMs });
  }
  files.sort((a, b) => b.time - a.time);
  for (const f of files.slice(2))
    if (f.time < Date.now() - days * 86400000) await unlink(f.path);
}
export async function verifyEncryptedBackup(path: string) {
  const url = new URL(
    process.env.RESTORE_TEST_DATABASE_URL || process.env.DATABASE_URL || "",
  );
  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname))
    throw Error(
      "O ensaio automático só restaura em PostgreSQL local. Nunca restaura sobre a hospedagem.",
    );
  const database = "restore_check_" + randomBytes(8).toString("hex");
  if (!/^restore_check_[a-f0-9]{16}$/.test(database))
    throw Error("Nome temporário inválido.");
  const temporary = resolve("tmp/restore");
  await mkdir(temporary, { recursive: true });
  const dump = join(temporary, database + ".dump");
  const env = connectionEnv(url.href);
  let created = false;
  function command(name: string, args: string[]) {
    const result = spawnSync(pgClientTool(name), args, {
      env,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    if (result.status !== 0)
      throw Error(
        "A etapa " + name + " do ensaio de restauração não foi concluída.",
      );
    return result.stdout.trim();
  }
  try {
    await decryptBackup(resolve(path), dump);
    command("createdb", ["--maintenance-db=postgres", database]);
    created = true;
    command("pg_restore", [
      "--dbname=" + database,
      "--exit-on-error",
      "--no-owner",
      "--no-acl",
      dump,
    ]);
    return command("psql", [
      "--dbname=" + database,
      "-Atc",
      "SELECT count(*) FROM appointments; SELECT count(*) FROM auth_user; SELECT count(*) FROM tenants;",
    ]);
  } finally {
    try {
      if (created)
        command("dropdb", ["--maintenance-db=postgres", "--force", database]);
    } finally {
      await unlink(dump).catch(() => {});
    }
  }
}
export async function processScheduledBackup() {
  if (process.env.BACKUP_ENABLED !== "true") return;
  const interval = Number(process.env.BACKUP_INTERVAL_HOURS || 24);
  if (!Number.isFinite(interval) || interval < 1 || interval > 168)
    throw Error("Intervalo de backup inválido.");
  const lock = await db.connect();
  let runId: string | undefined;
  try {
    const acquired = (
      await lock.query(
        "SELECT pg_try_advisory_lock(hashtext('elares-scheduled-backup')) acquired",
      )
    ).rows[0].acquired;
    if (!acquired) return;
    const last = (
      await lock.query(
        "SELECT finished_at FROM operation_runs WHERE kind='backup' AND status='success' ORDER BY finished_at DESC LIMIT 1",
      )
    ).rows[0];
    if (last && +new Date(last.finished_at) > Date.now() - interval * 3600000)
      return;
    runId = (
      await lock.query(
        "INSERT INTO operation_runs(kind,status) VALUES('backup','running') RETURNING id",
      )
    ).rows[0].id;
    const path = await createEncryptedBackup();
    await uploadBackup(path);
    await applyBackupRetention(
      dirname(path),
      Number(process.env.BACKUP_RETENTION_DAYS || 14),
    );
    await lock.query(
      "UPDATE operation_runs SET status='success',finished_at=now(),detail='Cópia criptografada confirmada pelo destino externo.' WHERE id=$1",
      [runId],
    );
  } catch {
    if (runId)
      await lock.query(
        "UPDATE operation_runs SET status='failed',finished_at=now(),detail='Backup ou envio externo não confirmado. Confira a configuração e o destino.' WHERE id=$1",
        [runId],
      );
    console.error(JSON.stringify({ event: "scheduled_backup_failed" }));
  } finally {
    await lock.query(
      "SELECT pg_advisory_unlock(hashtext('elares-scheduled-backup'))",
    );
    lock.release();
  }
}
