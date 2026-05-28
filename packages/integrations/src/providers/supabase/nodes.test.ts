import { getHandler, hasHandler, resetRegistry, type ExecutionContext } from "@workflow/workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { withRateLimitMock } = vi.hoisted(() => ({
  withRateLimitMock: vi.fn((_p: string, _t: string, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("../../rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

import {
  SUPABASE_INSERT_TYPE,
  SUPABASE_SELECT_TYPE,
  registerSupabaseNodes,
  supabaseHandlers,
} from "./nodes";

const TENANT = "00000000-0000-0000-0000-000000000099";
const SUPABASE_URL = "https://abcd.supabase.co";
const SERVICE_KEY = "service-role-key-test-VERY-secret-987654321";

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

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
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

describe("registerSupabaseNodes", () => {
  it("registers both supabase handlers in the workflow registry", () => {
    expect(hasHandler(SUPABASE_INSERT_TYPE)).toBe(false);
    registerSupabaseNodes();
    expect(hasHandler(SUPABASE_INSERT_TYPE)).toBe(true);
    expect(hasHandler(SUPABASE_SELECT_TYPE)).toBe(true);
  });

  it("is idempotent — calling twice does not throw", () => {
    registerSupabaseNodes();
    expect(() => registerSupabaseNodes()).not.toThrow();
  });

  it("exposes exactly the supabase.insert and supabase.select types", () => {
    expect(supabaseHandlers.map((h) => h.type).sort()).toEqual(
      [SUPABASE_INSERT_TYPE, SUPABASE_SELECT_TYPE].sort(),
    );
  });
});

describe("supabase workflow handlers", () => {
  beforeEach(() => {
    registerSupabaseNodes();
  });

  it("supabase.insert loads url+serviceKey via ctx.loadCredential('supabase') and injects tenantId", async () => {
    loadCredentialMock.mockResolvedValueOnce({
      url: SUPABASE_URL,
      anonKey: "anon-key-xxx",
      serviceKey: SERVICE_KEY,
    });
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 1, name: "Ada" }], { status: 201 }));

    const handler = getHandler(SUPABASE_INSERT_TYPE);
    const result = await handler.execute({ table: "users", data: { name: "Ada" } }, makeCtx());

    expect(result).toEqual({ rows: [{ id: 1, name: "Ada" }], count: 1 });
    expect(loadCredentialMock).toHaveBeenCalledWith("supabase");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${SUPABASE_URL}/rest/v1/users`);
    const headers = init.headers as Record<string, string>;
    expect(headers.apikey).toBe(SERVICE_KEY);
    expect(headers.Authorization).toBe(`Bearer ${SERVICE_KEY}`);
  });

  it("supabase.insert input schema strips tenantId — credential/engine are the only sources", () => {
    const handler = getHandler(SUPABASE_INSERT_TYPE);
    const parsed = handler.inputSchema.safeParse({
      tenantId: "leaked-tenant",
      table: "users",
      data: { x: 1 },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const value = parsed.data as Record<string, unknown>;
      expect(value).not.toHaveProperty("tenantId");
    }
  });

  it("supabase.insert throws CredentialNotFoundError when ctx.loadCredential is absent", async () => {
    const handler = getHandler(SUPABASE_INSERT_TYPE);
    const ctx = makeCtx();
    delete (ctx as { loadCredential?: unknown }).loadCredential;

    await expect(handler.execute({ table: "users", data: { x: 1 } }, ctx)).rejects.toThrow(
      /Supabase credential/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("supabase.select uses tenantId from ExecutionContext and applies filter/limit", async () => {
    loadCredentialMock.mockResolvedValueOnce({
      url: SUPABASE_URL,
      anonKey: "anon-key-xxx",
      serviceKey: SERVICE_KEY,
    });
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 7 }]));

    const handler = getHandler(SUPABASE_SELECT_TYPE);
    const result = await handler.execute(
      { table: "orders", filter: { id: "eq.7" }, limit: 5 },
      makeCtx({ tenantId: "tenant-xyz" }),
    );

    expect(result).toEqual({ rows: [{ id: 7 }], count: 1 });

    const [url] = fetchMock.mock.calls[0] as [string];
    const parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe(`${SUPABASE_URL}/rest/v1/orders`);
    expect(parsed.searchParams.get("id")).toBe("eq.7");
    expect(parsed.searchParams.get("limit")).toBe("5");

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    const call = withRateLimitMock.mock.calls[0] as [string, string, () => Promise<unknown>];
    expect(call[0]).toBe("supabase");
    expect(call[1]).toBe("tenant-xyz");
  });

  it("redacts the service key from PostgREST error responses", async () => {
    loadCredentialMock.mockResolvedValueOnce({
      url: SUPABASE_URL,
      anonKey: "anon-key-xxx",
      serviceKey: SERVICE_KEY,
    });
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: `Forbidden ${SERVICE_KEY} is invalid`,
          code: "PGRST301",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    );

    const handler = getHandler(SUPABASE_SELECT_TYPE);
    try {
      await handler.execute({ table: "users" }, makeCtx());
      throw new Error("should have rejected");
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toMatch(/Supabase API error/);
      expect(message).not.toContain(SERVICE_KEY);
    }
  });

  it("applies rate limiting (withRateLimit is invoked with the supabase key)", async () => {
    loadCredentialMock.mockResolvedValueOnce({
      url: SUPABASE_URL,
      anonKey: "anon-key-xxx",
      serviceKey: SERVICE_KEY,
    });
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 1 }], { status: 201 }));

    const handler = getHandler(SUPABASE_INSERT_TYPE);
    await handler.execute({ table: "users", data: { x: 1 } }, makeCtx());

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    expect(withRateLimitMock.mock.calls[0]?.[0]).toBe("supabase");
  });
});
