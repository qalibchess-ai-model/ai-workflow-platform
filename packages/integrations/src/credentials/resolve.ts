import { credentialQueries, type Database, type DecryptedCredential } from "@workflow/db";

import { IntegrationConfigError } from "../errors";
import { PROVIDER_METADATA, getCredentialSchema, isKnownProvider } from "./schemas";

export class CredentialNotFoundError extends IntegrationConfigError {
  public readonly provider: string;
  constructor(provider: string) {
    const display = isKnownProvider(provider) ? PROVIDER_METADATA[provider].displayName : provider;
    super(`${display} credential tapılmadı. Settings → Credentials bölməsindən əlavə et.`);
    this.name = "CredentialNotFoundError";
    this.provider = provider;
  }
}

export interface ResolveCredentialParams {
  db: Database;
  tenantId: string;
  provider: string;
  /** Optional label disambiguator when the tenant has multiple credentials for the same provider. */
  label?: string;
}

/**
 * Load a tenant's credential for a provider, validate its shape against the
 * provider schema, and return the parsed value. Server-side / worker only.
 *
 * Throws CredentialNotFoundError when the tenant has not configured the
 * provider — callers should let this propagate so the run logs a clear,
 * actionable error.
 */
export async function resolveCredential<T = Record<string, unknown>>(
  params: ResolveCredentialParams,
): Promise<T> {
  const decrypted: DecryptedCredential | null = await credentialQueries.getDecrypted(params.db, {
    tenantId: params.tenantId,
    provider: params.provider,
    label: params.label,
  });
  if (!decrypted) {
    throw new CredentialNotFoundError(params.provider);
  }

  if (isKnownProvider(params.provider)) {
    const schema = getCredentialSchema(params.provider);
    return schema.parse(decrypted.value) as T;
  }
  return decrypted.value as T;
}
