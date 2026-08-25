import { createCipheriv, createDecipheriv, randomBytes, createHash, timingSafeEqual } from "node:crypto";

/**
 * AES-256-GCM pour le jeton de rafraîchissement Google.
 * La clé vient de ENCRYPTION_KEY (32 octets en hex ou base64, ou toute
 * chaîne longue qu'on dérive en SHA-256).
 */

function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY manquante");
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  const b64 = Buffer.from(raw, "base64");
  if (b64.length === 32) return b64;
  return createHash("sha256").update(raw).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decrypt(payload: string): string {
  const [v, iv, tag, data] = payload.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Charge chiffrée invalide");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

/** Comparaison à temps constant, pour le code d'installation. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function token(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

/** Référence lisible : NVX-7F3K2Q (sans caractères ambigus). */
export function bookingRef(): string {
  const alphabet = "ACDEFGHJKLMNPQRSTUVWXY3479";
  const buf = randomBytes(6);
  let out = "";
  for (const b of buf) out += alphabet[b % alphabet.length];
  return `NVX-${out}`;
}
