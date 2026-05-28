import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { _resetEncryptionKeyCache, encrypt } from "../crypto";
import type { Credential } from "../schema";
import * as credentialQueries from "./credentials";
import { createMockDb } from "./_test-helpers";

const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const tenantId = "11111111-1111-1111-1111-111111111111";

function makeRow(value: Record<string, unknown>, overrides: Partial<Credential> = {}): Credential {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    tenantId,
    provider: "notion",
    label: "Production",
    encryptedValue: encrypt(JSON.stringify(value)),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("credentialQueries", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    _resetEncryptionKeyCache();
  });
  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
    _resetEncryptionKeyCache();
  });

  describe("create", () => {
    it("encrypts the payload and returns masked fields", async () => {
      const row = makeRow({ apiKey: "secret_abcdef1234567890" });
      const { db, insert } = createMockDb({ insertResult: [row] });

      const result = await credentialQueries.create(db, {
        tenantId,
        provider: "notion",
        label: "Production",
        value: { apiKey: "secret_abcdef1234567890" },
      });

      expect(result.id).toBe(row.id);
      expect(result.provider).toBe("notion");
      expect(result.maskedFields.apiKey).toBe("••••7890");
      // raw value must not appear anywhere on the returned object
      expect(JSON.stringify(result)).not.toContain("secret_abcdef1234567890");
      expect(insert).toHaveBeenCalledTimes(1);
    });

    it("throws when insert returns nothing", async () => {
      const { db } = createMockDb({ insertResult: [] });
      await expect(
        credentialQueries.create(db, {
          tenantId,
          provider: "notion",
          label: "x",
          value: { apiKey: "y" },
        }),
      ).rejects.toThrow(/Failed to insert credential/);
    });
  });

  describe("listForTenant", () => {
    it("returns masked credentials only", async () => {
      const row = makeRow({ apiKey: "secret_xxxxx1234" });
      const { db, select } = createMockDb({ selectResult: [row] });

      const result = await credentialQueries.listForTenant(db, tenantId);

      expect(result).toHaveLength(1);
      expect(result[0]!.maskedFields.apiKey).toBe("••••1234");
      // raw must not leak
      expect(JSON.stringify(result)).not.toContain("secret_xxxxx1234");
      expect(select).toHaveBeenCalledTimes(1);
    });

    it("returns empty list when tenant has none", async () => {
      const { db } = createMockDb({ selectResult: [] });
      expect(await credentialQueries.listForTenant(db, tenantId)).toEqual([]);
    });
  });

  describe("getDecrypted", () => {
    it("returns the decrypted payload for the tenant", async () => {
      const row = makeRow({ apiKey: "secret_full_value" });
      const { db } = createMockDb({ selectResult: [row] });

      const result = await credentialQueries.getDecrypted(db, {
        tenantId,
        provider: "notion",
      });

      expect(result?.value).toEqual({ apiKey: "secret_full_value" });
    });

    it("returns null when nothing found", async () => {
      const { db } = createMockDb({ selectResult: [] });
      const result = await credentialQueries.getDecrypted(db, {
        tenantId,
        provider: "notion",
      });
      expect(result).toBeNull();
    });
  });

  describe("remove", () => {
    it("returns true when a row was deleted", async () => {
      const { db, delete: del } = createMockDb({ deleteResult: [{ id: "x" }] });
      expect(await credentialQueries.remove(db, { id: "x", tenantId })).toBe(true);
      expect(del).toHaveBeenCalledTimes(1);
    });

    it("returns false when no row matched (wrong tenant)", async () => {
      const { db } = createMockDb({ deleteResult: [] });
      expect(await credentialQueries.remove(db, { id: "x", tenantId })).toBe(false);
    });
  });
});
