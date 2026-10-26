import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
function key() {
  if (!process.env.BETTER_AUTH_SECRET)
    throw Error("BETTER_AUTH_SECRET precisa ser configurado.");
  return createHash("sha256")
    .update(process.env.BETTER_AUTH_SECRET + "outbox-v1")
    .digest();
}
export function encryptToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}
export function decryptToken(value: string) {
  const data = Buffer.from(value, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([
    decipher.update(data.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}
