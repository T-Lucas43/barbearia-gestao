import { auth } from "../lib/auth-engine";
import { db } from "../lib/db";
import { z } from "zod";
export async function bootstrapPlatform() {
  const email = z.email().parse(process.env.INITIAL_ADMIN_EMAIL).toLowerCase();
  const password = process.env.INITIAL_LOCAL_PASSWORD;
  if (!password || password.length < 16 || password === "demo-local-2026")
    throw Error(
      "Configure senha administrativa exclusiva com pelo menos 16 caracteres.",
    );
  let user = (
    await db.query("SELECT id FROM auth_user WHERE lower(email)=$1", [email])
  ).rows[0];
  if (user) {
    const admin = (
      await db.query(
        "SELECT 1 FROM platform_admins WHERE user_id=$1 AND active",
        [user.id],
      )
    ).rowCount;
    if (!admin)
      throw Error(
        "O e-mail inicial já pertence a outra conta. Não será promovido automaticamente.",
      );
    return;
  }
  user = (
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: process.env.OPERATOR_LEGAL_NAME || "Administração Elares",
      },
    })
  ).user;
  await db.query("INSERT INTO platform_admins(user_id) VALUES($1)", [user.id]);
  console.log(
    "Administração da plataforma criada. Confirme o e-mail e configure segundo fator em /minha-conta. Nenhuma barbearia fictícia foi criada.",
  );
}
