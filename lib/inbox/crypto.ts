/**
 * Inbox — cifrado de los tokens de plataforma.
 *
 * Los tokens de Meta y Google se guardan cifrados en `inbox_accounts`. Nunca
 * salen por ninguna ruta de API ni se escriben en logs.
 *
 * AES-256-GCM con clave de 32 bytes en `INBOX_TOKEN_KEY` (base64):
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITMO = "aes-256-gcm";
const IV_BYTES = 12; // recomendado para GCM

function clave(): Buffer | null {
  const raw = process.env.INBOX_TOKEN_KEY;
  if (!raw) return null;
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("INBOX_TOKEN_KEY debe ser de 32 bytes en base64");
  }
  return buf;
}

export function cifradoDisponible(): boolean {
  return Boolean(process.env.INBOX_TOKEN_KEY);
}

/** Devuelve `iv.tag.ciphertext`, todo en base64url. */
export function cifrar(texto: string): string {
  const key = clave();
  if (!key) throw new Error("Falta INBOX_TOKEN_KEY: no se pueden guardar tokens");

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITMO, key, iv);
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, cifrado].map((b) => b.toString("base64url")).join(".");
}

export function descifrar(paquete: string): string {
  const key = clave();
  if (!key) throw new Error("Falta INBOX_TOKEN_KEY: no se pueden leer tokens");

  const partes = paquete.split(".");
  if (partes.length !== 3) throw new Error("Token cifrado con formato inválido");

  const [iv, tag, cifrado] = partes.map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv(ALGORITMO, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString("utf8");
}
