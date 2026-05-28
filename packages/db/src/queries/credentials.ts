import { and, desc, eq } from "drizzle-orm";

import type { Database } from "../client";
import { credentials, type Credential } from "../schema";
import { decrypt, encrypt, maskSecret } from "../crypto";

export interface CredentialPayload {
  /** Arbitrary JSON-serializable secret material (apiKey, tokens, ...). */
  [key: string]: unknown;
}

export interface CreateCredentialInput {
  tenantId: string;
  provider: string;
  label: string;
  value: CredentialPayload;
}

export interface MaskedCredential {
  id: string;
  tenantId: string;
  provider: string;
  label: string;
  /** Field-by-field masked preview. Never the raw secret. */
  maskedFields: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DecryptedCredential {
  id: string;
  tenantId: string;
  provider: string;
  label: string;
  value: CredentialPayload;
  createdAt: Date;
  updatedAt: Date;
}

function serialize(value: CredentialPayload): string {
  return JSON.stringify(value);
}

function deserialize(plaintext: string): CredentialPayload {
  const parsed: unknown = JSON.parse(plaintext);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Decrypted credential payload is not an object");
  }
  return parsed as CredentialPayload;
}

function maskFields(value: CredentialPayload): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = typeof v === "string" ? maskSecret(v) : "••••";
  }
  return out;
}

function toMasked(row: Credential): MaskedCredential {
  let maskedFields: Record<string, string>;
  try {
    maskedFields = maskFields(deserialize(decrypt(row.encryptedValue)));
  } catch {
    maskedFields = {};
  }
  return {
    id: row.id,
    tenantId: row.tenantId,
    provider: row.provider,
    label: row.label,
    maskedFields,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function create(
  db: Database,
  input: CreateCredentialInput,
): Promise<MaskedCredential> {
  const encrypted = encrypt(serialize(input.value));
  const [row] = await db
    .insert(credentials)
    .values({
      tenantId: input.tenantId,
      provider: input.provider,
      label: input.label,
      encryptedValue: encrypted,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert credential");
  }
  return toMasked(row);
}

export async function listForTenant(db: Database, tenantId: string): Promise<MaskedCredential[]> {
  const rows = await db
    .select()
    .from(credentials)
    .where(eq(credentials.tenantId, tenantId))
    .orderBy(desc(credentials.createdAt));
  return rows.map(toMasked);
}

/**
 * SECURITY: server-side / execution context only. Never call from a Server
 * Component that returns the value to the browser. The plaintext payload must
 * never leave the worker / API boundary.
 */
export async function getDecrypted(
  db: Database,
  params: { tenantId: string; provider: string; label?: string },
): Promise<DecryptedCredential | null> {
  const conditions = [
    eq(credentials.tenantId, params.tenantId),
    eq(credentials.provider, params.provider),
  ];
  if (params.label) {
    conditions.push(eq(credentials.label, params.label));
  }
  const [row] = await db
    .select()
    .from(credentials)
    .where(and(...conditions))
    .orderBy(desc(credentials.createdAt))
    .limit(1);
  if (!row) return null;
  const value = deserialize(decrypt(row.encryptedValue));
  return {
    id: row.id,
    tenantId: row.tenantId,
    provider: row.provider,
    label: row.label,
    value,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function remove(
  db: Database,
  params: { id: string; tenantId: string },
): Promise<boolean> {
  const rows = await db
    .delete(credentials)
    .where(and(eq(credentials.id, params.id), eq(credentials.tenantId, params.tenantId)))
    .returning({ id: credentials.id });
  return rows.length > 0;
}
