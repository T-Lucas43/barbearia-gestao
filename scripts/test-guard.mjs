import "dotenv/config";
const url = new URL(process.env.DATABASE_URL || "");
if (
  !["localhost", "127.0.0.1", "::1"].includes(url.hostname) ||
  url.pathname !== "/barber" ||
  process.env.NODE_ENV === "production" ||
  process.env.MAIL_TRANSPORT === "smtp"
)
  throw Error(
    "A suíte aceita somente o banco local barber e não permite envio SMTP ou modo de produção.",
  );
