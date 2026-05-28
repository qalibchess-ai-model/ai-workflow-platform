"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { credentialQueries } from "@workflow/db";
import {
  CREDENTIAL_PROVIDERS,
  isKnownProvider,
  parseCredentialValue,
} from "@workflow/integrations";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const ProviderEnum = z.enum(CREDENTIAL_PROVIDERS as [string, ...string[]]);

const CreateInputSchema = z.object({
  provider: ProviderEnum,
  label: z.string().min(1, "Label tələb olunur").max(80),
  value: z.record(z.string()),
});

const DeleteInputSchema = z.object({
  id: z.string().uuid(),
});

export type CreateCredentialResult = { ok: true; id: string } | { ok: false; error: string };

export type DeleteCredentialResult = { ok: true } | { ok: false; error: string };

export async function createCredentialAction(
  input: z.infer<typeof CreateInputSchema>,
): Promise<CreateCredentialResult> {
  const { tenantId } = await requireAuth();

  const parsed = CreateInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Yanlış input" };
  }

  if (!isKnownProvider(parsed.data.provider)) {
    return { ok: false, error: "Naməlum provider" };
  }

  let value: Record<string, unknown>;
  try {
    value = parseCredentialValue(parsed.data.provider, parsed.data.value);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Credential keçərsizdir";
    return { ok: false, error: message };
  }

  const created = await credentialQueries.create(db, {
    tenantId,
    provider: parsed.data.provider,
    label: parsed.data.label,
    value,
  });

  revalidatePath("/settings/credentials");
  return { ok: true, id: created.id };
}

export async function deleteCredentialAction(
  input: z.infer<typeof DeleteInputSchema>,
): Promise<DeleteCredentialResult> {
  const { tenantId } = await requireAuth();

  const parsed = DeleteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Yanlış input" };
  }

  const ok = await credentialQueries.remove(db, { id: parsed.data.id, tenantId });
  if (!ok) return { ok: false, error: "Credential tapılmadı" };

  revalidatePath("/settings/credentials");
  return { ok: true };
}
