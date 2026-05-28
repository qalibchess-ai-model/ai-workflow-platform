import { IntegrationError } from "../../errors";
import { withRateLimit } from "../../rate-limit";
import {
  SUPABASE_PROVIDER_KEY,
  SupabaseInsertInput,
  SupabaseInsertOutput,
  SupabaseSelectInput,
  SupabaseSelectOutput,
} from "./schemas";

export type SupabaseAuth = {
  url: string;
  serviceKey: string;
};

type PostgrestError = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

/**
 * The service role key is a long-lived secret. It travels in headers, not the
 * URL, but a fetch error message or PostgREST response could still echo it
 * back (e.g. in a `details` field) — strip it before anything bubbles up to a
 * user-visible error.
 */
function redactKey(text: string, serviceKey: string): string {
  if (!serviceKey) return text;
  return text.split(serviceKey).join("***");
}

function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function authHeaders(serviceKey: string): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
}

async function readPostgrestError(response: Response, serviceKey: string): Promise<string> {
  const status = response.status;
  let bodyText: string;
  try {
    bodyText = await response.text();
  } catch {
    return `HTTP ${status}`;
  }
  if (!bodyText) return `HTTP ${status}`;

  try {
    const parsed = JSON.parse(bodyText) as PostgrestError;
    const parts: string[] = [];
    if (typeof parsed.message === "string") parts.push(parsed.message);
    if (typeof parsed.code === "string") parts.push(`code=${parsed.code}`);
    if (typeof parsed.details === "string") parts.push(parsed.details);
    if (parts.length > 0) return redactKey(parts.join(" — "), serviceKey);
  } catch {
    // not JSON — fall through
  }
  return redactKey(`HTTP ${status}: ${bodyText.slice(0, 200)}`, serviceKey);
}

function buildSelectQuery(
  filter: Record<string, string> | undefined,
  limit: number | undefined,
): string {
  const params = new URLSearchParams();
  if (filter) {
    for (const [column, condition] of Object.entries(filter)) {
      params.append(column, condition);
    }
  }
  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function callPostgrest(
  auth: SupabaseAuth,
  path: string,
  init: RequestInit,
): Promise<unknown> {
  const url = `${trimTrailingSlash(auth.url)}/rest/v1${path}`;
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new IntegrationError(`Supabase request failed: ${redactKey(message, auth.serviceKey)}`);
  }

  if (!response.ok) {
    const detail = await readPostgrestError(response, auth.serviceKey);
    throw new IntegrationError(`Supabase API error: ${detail}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new IntegrationError(`Supabase returned non-JSON response (status ${response.status})`);
  }
  return payload;
}

function asRowArray(payload: unknown): Record<string, unknown>[] {
  if (!Array.isArray(payload)) {
    throw new IntegrationError("Supabase response was not a JSON array");
  }
  for (const row of payload) {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      throw new IntegrationError("Supabase response contained a non-object row");
    }
  }
  return payload as Record<string, unknown>[];
}

export async function insertRow(
  rawInput: unknown,
  auth: SupabaseAuth,
): Promise<SupabaseInsertOutput> {
  const input = SupabaseInsertInput.parse(rawInput);

  return withRateLimit(SUPABASE_PROVIDER_KEY, input.tenantId, async () => {
    const body = JSON.stringify(input.data);
    const payload = await callPostgrest(auth, `/${input.table}`, {
      method: "POST",
      headers: {
        ...authHeaders(auth.serviceKey),
        Prefer: "return=representation",
      },
      body,
    });

    const rows = asRowArray(payload);
    return SupabaseInsertOutput.parse({ rows, count: rows.length });
  });
}

export async function selectRows(
  rawInput: unknown,
  auth: SupabaseAuth,
): Promise<SupabaseSelectOutput> {
  const input = SupabaseSelectInput.parse(rawInput);

  return withRateLimit(SUPABASE_PROVIDER_KEY, input.tenantId, async () => {
    const qs = buildSelectQuery(input.filter, input.limit);
    const payload = await callPostgrest(auth, `/${input.table}${qs}`, {
      method: "GET",
      headers: authHeaders(auth.serviceKey),
    });

    const rows = asRowArray(payload);
    return SupabaseSelectOutput.parse({ rows, count: rows.length });
  });
}
