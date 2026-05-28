import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const FORMAT_VERSION = "v1";

export class EncryptionKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionKeyError";
  }
}

export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecryptionError";
  }
}

let cachedKey: Buffer | undefined;
let cachedKeyEnv: string | undefined;

function loadKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.trim().length === 0) {
    throw new EncryptionKeyError(
      "ENCRYPTION_KEY is not set. Generate one with `openssl rand -hex 32` and add it to your .env.",
    );
  }
  if (cachedKey && cachedKeyEnv === raw) return cachedKey;

  let key: Buffer;
  try {
    key = Buffer.from(raw, "hex");
  } catch {
    throw new EncryptionKeyError("ENCRYPTION_KEY must be a hex string.");
  }
  if (key.length !== KEY_BYTES) {
    throw new EncryptionKeyError(
      `ENCRYPTION_KEY must be ${KEY_BYTES} bytes (${KEY_BYTES * 2} hex chars). Got ${key.length} bytes.`,
    );
  }

  cachedKey = key;
  cachedKeyEnv = raw;
  return key;
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Output format: "v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>".
 */
export function encrypt(plaintext: string): string {
  if (typeof plaintext !== "string") {
    throw new TypeError("encrypt: plaintext must be a string");
  }
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${FORMAT_VERSION}:${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/**
 * Decrypt a value produced by {@link encrypt}. Throws {@link DecryptionError} on
 * tampering, wrong key, or malformed payloads.
 */
export function decrypt(payload: string): string {
  if (typeof payload !== "string" || payload.length === 0) {
    throw new DecryptionError("decrypt: payload must be a non-empty string");
  }
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new DecryptionError("Malformed ciphertext payload");
  }
  const ivHex = parts[1];
  const tagHex = parts[2];
  const dataHex = parts[3];
  if (!ivHex || !tagHex || dataHex === undefined) {
    throw new DecryptionError("Malformed ciphertext payload");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(dataHex, "hex");
  if (iv.length !== IV_BYTES) throw new DecryptionError("Invalid IV length");
  if (authTag.length !== AUTH_TAG_BYTES) throw new DecryptionError("Invalid auth tag length");

  const key = loadKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  try {
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch {
    throw new DecryptionError("Decryption failed: ciphertext was tampered with or wrong key");
  }
}

/**
 * Mask a secret for display. Reveals at most the last 4 characters; shorter
 * secrets are fully masked. Returns a constant-width-ish prefix so the UI is
 * predictable. NEVER log the raw secret.
 */
export function maskSecret(secret: string): string {
  if (typeof secret !== "string" || secret.length === 0) return "••••";
  if (secret.length <= 4) return "••••";
  return `••••${secret.slice(-4)}`;
}

/** Test-only: reset memoized key (used between tests). */
export function _resetEncryptionKeyCache(): void {
  cachedKey = undefined;
  cachedKeyEnv = undefined;
}
