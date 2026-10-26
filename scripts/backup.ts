import "dotenv/config";
import { createEncryptedBackup, verifyEncryptedBackup } from "../lib/backup";
import { db } from "../lib/db";
try {
  const mode = process.argv[2] || "create";
  if (mode === "create")
    console.log("Backup criptografado criado:", await createEncryptedBackup());
  else if (mode === "verify") {
    if (!process.argv[3]) throw Error("Informe o arquivo de backup.");
    console.log(
      "Restauração em banco temporário verificada. Atendimentos, usuários e barbearias:",
      await verifyEncryptedBackup(process.argv[3]),
    );
  } else throw Error("Use create ou verify.");
} finally {
  await db.end();
}
