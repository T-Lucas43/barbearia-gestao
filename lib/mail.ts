import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { z } from "zod";
export function mailReady() {
  if (process.env.MAIL_TRANSPORT === "capture")
    return process.env.NODE_ENV !== "production";
  return (
    process.env.MAIL_TRANSPORT === "smtp" &&
    !!process.env.SMTP_HOST &&
    !!process.env.SMTP_USER &&
    !!process.env.SMTP_PASSWORD &&
    z.email().safeParse(process.env.MAIL_FROM).success &&
    [465, 587].includes(Number(process.env.SMTP_PORT || 587))
  );
}
export function appOrigin() {
  return new URL(process.env.APP_URL || "http://127.0.0.1:3000").origin;
}
export async function sendAccessMail(
  to: string,
  kind: "reset" | "verify",
  url: string,
) {
  if (!mailReady()) throw new Error("Transporte de e-mail não configurado.");
  const recipient = z.email().parse(to);
  const destination = new URL(url);
  if (destination.origin !== appOrigin())
    throw new Error("Destino de recuperação inválido.");
  const title = kind === "reset" ? "Redefina sua senha" : "Confirme seu e-mail";
  const text = `${title} — Elares Barber\n\nAbra este endereço: ${url}\n\nEste link é pessoal e expira. Se você não solicitou esta ação, ignore esta mensagem. Não compartilhe o endereço.`;
  if (process.env.MAIL_TRANSPORT === "capture") {
    if (process.env.NODE_ENV === "production")
      throw new Error("Captura local indisponível em produção.");
    const directory = resolve("tmp/mailbox");
    await mkdir(directory, { recursive: true });
    await writeFile(
      resolve(directory, randomUUID() + ".json"),
      JSON.stringify({
        to: recipient,
        kind,
        url,
        text,
        createdAt: new Date().toISOString(),
      }),
      { mode: 0o600, flag: "wx" },
    );
    return;
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: true,
    tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
    logger: false,
    debug: false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  await transport.sendMail({
    from: { name: "Elares Barber", address: process.env.MAIL_FROM! },
    to: recipient,
    subject: `${title} — Elares Barber`,
    text,
  });
}
