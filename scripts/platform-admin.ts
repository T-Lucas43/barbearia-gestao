import "dotenv/config";
import { db } from "../lib/db";
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@"))
  throw Error("Informe o e-mail de uma conta individual existente.");
try {
  const user = (
    await db.query(
      "SELECT u.id FROM auth_user u JOIN memberships m ON m.user_id=u.id WHERE lower(u.email)=$1 AND m.active AND NOT m.is_demo",
      [email],
    )
  ).rows[0];
  if (!user)
    throw Error("A conta deve existir, estar ativa e não ser de demonstração.");
  await db.query(
    "INSERT INTO platform_admins(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET active=true",
    [user.id],
  );
  console.log(
    "Conta indicada habilitada como administradora da plataforma. Em produção, habilite segundo fator antes de operar.",
  );
} finally {
  await db.end();
}
