import { IntegrationError } from "../../errors";
import { withRateLimit } from "../../rate-limit";
import {
  CreateContactInput,
  CreateContactOutput,
  CreateDealInput,
  CreateDealOutput,
  HUBSPOT_PROVIDER_KEY,
} from "./schemas";

const DEFAULT_API_BASE = "https://api.hubapi.com";

type HubspotObjectResponse = {
  id?: unknown;
  properties?: Record<string, unknown>;
  createdAt?: unknown;
};

type HubspotErrorResponse = {
  status?: unknown;
  message?: unknown;
  category?: unknown;
  correlationId?: unknown;
};

function apiBase(): string {
  return process.env.HUBSPOT_API_BASE ?? DEFAULT_API_BASE;
}

/**
 * HubSpot Private App access tokens are bearer secrets. They can land in error
 * messages (e.g. proxied auth errors) and stack traces. Strip them before we
 * propagate text into IntegrationError messages or logs.
 */
function redactToken(text: string, accessToken: string): string {
  if (!accessToken) return text;
  return text.split(accessToken).join("***");
}

async function callHubspotApi<T>(
  accessToken: string,
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = `${apiBase()}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new IntegrationError(`HubSpot request failed: ${redactToken(message, accessToken)}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new IntegrationError(`HubSpot returned non-JSON response (status ${response.status})`);
  }

  if (!response.ok) {
    const err = (payload ?? {}) as HubspotErrorResponse;
    const desc = typeof err.message === "string" ? err.message : "unknown error";
    throw new IntegrationError(
      `HubSpot API error (${response.status}): ${redactToken(desc, accessToken)}`,
    );
  }

  return payload as T;
}

function extractId(payload: HubspotObjectResponse): string {
  if (typeof payload.id !== "string" || payload.id.length === 0) {
    throw new IntegrationError("HubSpot response missing string id");
  }
  return payload.id;
}

function extractCreatedAt(payload: HubspotObjectResponse): string {
  if (typeof payload.createdAt !== "string" || payload.createdAt.length === 0) {
    throw new IntegrationError("HubSpot response missing createdAt timestamp");
  }
  return payload.createdAt;
}

function buildContactProperties(input: CreateContactInput): Record<string, string> {
  const properties: Record<string, string> = { email: input.email };
  if (input.firstName) properties.firstname = input.firstName;
  if (input.lastName) properties.lastname = input.lastName;
  if (input.properties) {
    for (const [key, value] of Object.entries(input.properties)) {
      properties[key] = String(value);
    }
  }
  return properties;
}

function buildDealProperties(input: CreateDealInput): Record<string, string> {
  const properties: Record<string, string> = { dealname: input.dealName };
  if (typeof input.amount === "number") properties.amount = String(input.amount);
  if (input.stage) properties.dealstage = input.stage;
  return properties;
}

export async function createContact(
  rawInput: unknown,
  accessToken: string,
): Promise<CreateContactOutput> {
  const input = CreateContactInput.parse(rawInput);

  return withRateLimit(HUBSPOT_PROVIDER_KEY, input.tenantId, async () => {
    const properties = buildContactProperties(input);
    const response = await callHubspotApi<HubspotObjectResponse>(
      accessToken,
      "/crm/v3/objects/contacts",
      { properties },
    );

    const email =
      typeof response.properties?.email === "string" ? response.properties.email : input.email;

    return CreateContactOutput.parse({
      contactId: extractId(response),
      email,
      createdAt: extractCreatedAt(response),
    });
  });
}

export async function createDeal(
  rawInput: unknown,
  accessToken: string,
): Promise<CreateDealOutput> {
  const input = CreateDealInput.parse(rawInput);

  return withRateLimit(HUBSPOT_PROVIDER_KEY, input.tenantId, async () => {
    const properties = buildDealProperties(input);
    const response = await callHubspotApi<HubspotObjectResponse>(
      accessToken,
      "/crm/v3/objects/deals",
      { properties },
    );

    const dealName =
      typeof response.properties?.dealname === "string"
        ? response.properties.dealname
        : input.dealName;

    return CreateDealOutput.parse({
      dealId: extractId(response),
      dealName,
      createdAt: extractCreatedAt(response),
    });
  });
}
