import { getHandler, hasHandler, resetRegistry, type ExecutionContext } from "@workflow/workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { withRateLimitMock } = vi.hoisted(() => ({
  withRateLimitMock: vi.fn((_p: string, _t: string, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("../../rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

import {
  HUBSPOT_CREATE_CONTACT_TYPE,
  HUBSPOT_CREATE_DEAL_TYPE,
  hubspotHandlers,
  registerHubspotNodes,
} from "./nodes";

const TENANT = "00000000-0000-0000-0000-000000000099";
const ACCESS_TOKEN = "pat-na1-FAKE-token-for-node-tests-0000";

const fetchMock = vi.fn();
const loadCredentialMock = vi.fn();

function makeCtx(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    runId: "run-1",
    workflowId: "wf-1",
    tenantId: TENANT,
    nodeId: "node-1",
    state: {},
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    loadCredential: loadCredentialMock as unknown as ExecutionContext["loadCredential"],
    ...overrides,
  };
}

beforeEach(() => {
  resetRegistry();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  loadCredentialMock.mockReset();
  withRateLimitMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("registerHubspotNodes", () => {
  it("registers both hubspot handlers in the workflow registry", () => {
    expect(hasHandler(HUBSPOT_CREATE_CONTACT_TYPE)).toBe(false);
    registerHubspotNodes();
    expect(hasHandler(HUBSPOT_CREATE_CONTACT_TYPE)).toBe(true);
    expect(hasHandler(HUBSPOT_CREATE_DEAL_TYPE)).toBe(true);
  });

  it("is idempotent — calling twice does not throw", () => {
    registerHubspotNodes();
    expect(() => registerHubspotNodes()).not.toThrow();
  });

  it("exposes exactly hubspot.createContact and hubspot.createDeal", () => {
    expect(hubspotHandlers.map((h) => h.type).sort()).toEqual(
      [HUBSPOT_CREATE_CONTACT_TYPE, HUBSPOT_CREATE_DEAL_TYPE].sort(),
    );
  });
});

describe("hubspot workflow handlers", () => {
  beforeEach(() => {
    registerHubspotNodes();
  });

  it("hubspot.createContact loads accessToken via ctx.loadCredential('hubspot') and injects tenantId", async () => {
    loadCredentialMock.mockResolvedValueOnce({ accessToken: ACCESS_TOKEN });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "100",
        properties: { email: "x@y.com" },
        createdAt: "2026-05-28T00:00:00.000Z",
      }),
    );

    const handler = getHandler(HUBSPOT_CREATE_CONTACT_TYPE);
    const result = await handler.execute({ email: "x@y.com", firstName: "X" }, makeCtx());

    expect(result).toEqual({
      contactId: "100",
      email: "x@y.com",
      createdAt: "2026-05-28T00:00:00.000Z",
    });
    expect(loadCredentialMock).toHaveBeenCalledWith("hubspot");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.hubapi.com/crm/v3/objects/contacts");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it("input schema strips accessToken and tenantId from caller params", () => {
    const handler = getHandler(HUBSPOT_CREATE_CONTACT_TYPE);
    const parsed = handler.inputSchema.safeParse({
      accessToken: "leaked-from-workflow-author",
      tenantId: "leaked-tenant",
      email: "x@y.com",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const value = parsed.data as Record<string, unknown>;
      expect(value).not.toHaveProperty("accessToken");
      expect(value).not.toHaveProperty("tenantId");
    }
  });

  it("hubspot.createContact throws CredentialNotFoundError when ctx.loadCredential is absent", async () => {
    const handler = getHandler(HUBSPOT_CREATE_CONTACT_TYPE);
    const ctx = makeCtx();
    delete (ctx as { loadCredential?: unknown }).loadCredential;

    await expect(handler.execute({ email: "x@y.com" }, ctx)).rejects.toThrow(/HubSpot credential/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hubspot.createDeal injects tenantId from ExecutionContext", async () => {
    loadCredentialMock.mockResolvedValueOnce({ accessToken: ACCESS_TOKEN });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "200",
        properties: { dealname: "Acme Deal" },
        createdAt: "2026-05-28T01:00:00.000Z",
      }),
    );

    const handler = getHandler(HUBSPOT_CREATE_DEAL_TYPE);
    await handler.execute(
      { dealName: "Acme Deal", amount: 1000 },
      makeCtx({ tenantId: "tenant-xyz" }),
    );

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    const call = withRateLimitMock.mock.calls[0] as [string, string, () => Promise<unknown>];
    expect(call[0]).toBe("hubspot");
    expect(call[1]).toBe("tenant-xyz");
  });

  it("applies rate limiting under the hubspot key", async () => {
    loadCredentialMock.mockResolvedValueOnce({ accessToken: ACCESS_TOKEN });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "300",
        properties: { dealname: "d" },
        createdAt: "2026-05-28T02:00:00.000Z",
      }),
    );

    const handler = getHandler(HUBSPOT_CREATE_DEAL_TYPE);
    await handler.execute({ dealName: "d" }, makeCtx());

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    expect(withRateLimitMock.mock.calls[0]?.[0]).toBe("hubspot");
  });
});
