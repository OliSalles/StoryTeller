/**
 * Criptografia simétrica (AES-256-GCM) para segredos guardados no banco, como tokens de git.
 * A chave vem de KNOWLEDGE_SECRET_KEY ou, se não existir, de JWT_SECRET.
 * Os valores criptografados nunca devem ser devolvidos ao cliente.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function getKey(): Buffer {
  const secret = process.env.KNOWLEDGE_SECRET_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("KNOWLEDGE_SECRET_KEY ou JWT_SECRET precisa estar configurado para guardar tokens");
  }
  return createHash("sha256").update(`storyteller-knowledge:${secret}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) throw new Error("Formato de segredo inválido");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
