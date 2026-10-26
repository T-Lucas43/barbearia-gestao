import "dotenv/config";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { db } from "../lib/db";
import { auth } from "../lib/auth-engine";
const url = new URL(process.env.DATABASE_URL || "");
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.pathname !== "/barber"
)
  throw Error("Inicialização exclusiva do banco local barber.");
const email = "admin@elares.local";
try {
  const existing = (
    await db.query("SELECT id FROM auth_user WHERE email=$1", [email])
  ).rows[0];
  if (existing) {
    console.log(
      "Conta administrativa local já existe; nenhuma credencial foi alterada.",
    );
  } else {
    const password = randomBytes(24).toString("base64url");
    const user = (
      await auth.api.signUpEmail({
        body: { name: "Administração local Elares", email, password },
      })
    ).user;
    await db.query("INSERT INTO platform_admins(user_id) VALUES($1)", [
      user.id,
    ]);
    await mkdir("output", { recursive: true });
    await writeFile(
      "output/acesso-plataforma-local.txt",
      "Elares Barber — acesso exclusivo local\n\nEndereço: http://127.0.0.1:3000/administracao\nE-mail: " +
        email +
        "\nSenha: " +
        password +
        "\n\nEsta conta não foi criada na hospedagem. Não publicar este arquivo.\n",
      { mode: 0o600, flag: "wx" },
    );
    console.log(
      "Administração local criada. Acesso salvo somente em output/acesso-plataforma-local.txt.",
    );
  }
} finally {
  await db.end();
}
