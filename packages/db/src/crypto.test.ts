import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DecryptionError,
  EncryptionKeyError,
  _resetEncryptionKeyCache,
  decrypt,
  encrypt,
  maskSecret,
} from "./crypto";

const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const OTHER_KEY = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

describe("crypto", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    _resetEncryptionKeyCache();
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
    _resetEncryptionKeyCache();
  });

  describe("encrypt + decrypt", () => {
    it("round-trips an ascii string", () => {
      const plaintext = "secret_AbCdEfGhIjK";
      const ciphertext = encrypt(plaintext);
      expect(ciphertext).not.toContain(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });

    it("round-trips a JSON blob", () => {
      const plaintext = JSON.stringify({ apiKey: "xxx", baseUrl: "https://api.example.com" });
      const ciphertext = encrypt(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });

    it("round-trips utf8 characters", () => {
      const plaintext = "Şifrəli açar: ✨🔑";
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it("produces a unique IV each call (no deterministic output)", () => {
      const a = encrypt("same-input");
      const b = encrypt("same-input");
      expect(a).not.toBe(b);
      expect(decrypt(a)).toBe("same-input");
      expect(decrypt(b)).toBe("same-input");
    });

    it("rejects payload tampering (authTag fails)", () => {
      const ciphertext = encrypt("secret");
      const parts = ciphertext.split(":");
      const tampered = parts[3]!.replace(/^./, (c) => (c === "0" ? "1" : "0"));
      const corrupted = [parts[0], parts[1], parts[2], tampered].join(":");
      expect(() => decrypt(corrupted)).toThrow(DecryptionError);
    });

    it("rejects payload encrypted with a different key", () => {
      const ciphertext = encrypt("secret");
      process.env.ENCRYPTION_KEY = OTHER_KEY;
      _resetEncryptionKeyCache();
      expect(() => decrypt(ciphertext)).toThrow(DecryptionError);
    });

    it("rejects malformed payloads", () => {
      expect(() => decrypt("not-a-valid-payload")).toThrow(DecryptionError);
      expect(() => decrypt("")).toThrow(DecryptionError);
      expect(() => decrypt("v2:aa:bb:cc")).toThrow(DecryptionError);
    });
  });

  describe("ENCRYPTION_KEY validation", () => {
    it("throws when env is missing", () => {
      delete process.env.ENCRYPTION_KEY;
      _resetEncryptionKeyCache();
      expect(() => encrypt("anything")).toThrow(EncryptionKeyError);
    });

    it("throws when env is wrong length", () => {
      process.env.ENCRYPTION_KEY = "deadbeef";
      _resetEncryptionKeyCache();
      expect(() => encrypt("anything")).toThrow(EncryptionKeyError);
    });
  });

  describe("maskSecret", () => {
    it("masks a typical api key to last 4 chars", () => {
      expect(maskSecret("sk-abcdefghijklmnop")).toBe("••••mnop");
    });

    it("fully masks short secrets", () => {
      expect(maskSecret("abc")).toBe("••••");
      expect(maskSecret("abcd")).toBe("••••");
    });

    it("does not leak the raw secret in the output", () => {
      const secret = "secret_abcdef1234567890";
      const masked = maskSecret(secret);
      expect(masked).not.toContain("secret_abcdef");
      expect(masked.includes(secret)).toBe(false);
    });

    it("handles empty input", () => {
      expect(maskSecret("")).toBe("••••");
    });
  });
});
