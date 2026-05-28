import { getHandler, hasHandler, resetRegistry, type ExecutionContext } from "@workflow/workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { withRateLimitMock } = vi.hoisted(() => ({
  withRateLimitMock: vi.fn((_p: string, _t: string, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("../../rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

import {
  NOTION_CREATE_PAGE_TYPE,
  NOTION_QUERY_DATABASE_TYPE,
  notionHandlers,
  registerNotionNodes,
} from "./nodes";

const TENANT = "00000000-0000-0000-0000-000000000099";
const API_KEY = "secret_TestApiKeyForNotionWorkflowsXYZ12345";
const DB_ID = "abcdef01234567890abcdef012345678";
const PAGE_ID = "11111111-2222-3333-4444-555555555555";

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

describe("registerNotionNodes", () => {
  it("registers both notion handlers in the workflow registry", () => {
    expect(hasHandler(NOTION_CREATE_PAGE_TYPE)).toBe(false);
    registerNotionNodes();
    expect(hasHandler(NOTION_CREATE_PAGE_TYPE)).toBe(true);
    expect(hasHandler(NOTION_QUERY_DATABASE_TYPE)).toBe(true);
  });

  it("is idempotent — calling twice does not throw", () => {
    registerNotionNodes();
    expect(() => registerNotionNodes()).not.toThrow();
  });

  it("exposes exactly notion.createPage and notion.queryDatabase types", () => {
    expect(notionHandlers.map((h) => h.type).sort()).toEqual(
      [NOTION_CREATE_PAGE_TYPE, NOTION_QUERY_DATABASE_TYPE].sort(),
    );
  });
});

describe("notion workflow handlers", () => {
  beforeEach(() => {
    registerNotionNodes();
  });

  it("notion.createPage loads apiKey via ctx.loadCredential('notion') and injects tenantId", async () => {
    loadCredentialMock.mockResolvedValueOnce({ apiKey: API_KEY });
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: PAGE_ID }));

    const handler = getHandler(NOTION_CREATE_PAGE_TYPE);
    const result = await handler.execute(
      { databaseId: DB_ID, properties: { Name: { title: [] } } },
      makeCtx(),
    );

    expect(result).toMatchObject({ pageId: PAGE_ID, ok: true });
    expect(loadCredentialMock).toHaveBeenCalledWith("notion");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.notion.com/v1/pages");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${API_KEY}`);
  });

  it("notion.createPage input schema strips apiKey and tenantId from workflow params", () => {
    const handler = getHandler(NOTION_CREATE_PAGE_TYPE);
    const parsed = handler.inputSchema.safeParse({
      apiKey: "leaked-from-workflow-author",
      tenantId: "leaked-tenant",
      databaseId: DB_ID,
      properties: {},
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const value = parsed.data as Record<string, unknown>;
      expect(value).not.toHaveProperty("tenantId");
      expect(value).not.toHaveProperty("apiKey");
    }
  });

  it("notion.createPage throws CredentialNotFoundError when ctx.loadCredential is absent", async () => {
    const handler = getHandler(NOTION_CREATE_PAGE_TYPE);
    const ctx = makeCtx();
    delete (ctx as { loadCredential?: unknown }).loadCredential;

    await expect(handler.execute({ databaseId: DB_ID, properties: {} }, ctx)).rejects.toThrow(
      /Notion credential/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("notion.queryDatabase injects tenantId from ExecutionContext into rate-limit key", async () => {
    loadCredentialMock.mockResolvedValueOnce({ apiKey: API_KEY });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ results: [], next_cursor: null, has_more: false }),
    );

    const handler = getHandler(NOTION_QUERY_DATABASE_TYPE);
    await handler.execute({ databaseId: DB_ID }, makeCtx({ tenantId: "tenant-xyz" }));

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    const call = withRateLimitMock.mock.calls[0] as [string, string, () => Promise<unknown>];
    expect(call[0]).toBe("notion");
    expect(call[1]).toBe("tenant-xyz");
  });

  it("applies rate limiting on createPage (withRateLimit invoked with the notion key)", async () => {
    loadCredentialMock.mockResolvedValueOnce({ apiKey: API_KEY });
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: PAGE_ID }));

    const handler = getHandler(NOTION_CREATE_PAGE_TYPE);
    await handler.execute({ databaseId: DB_ID, properties: {} }, makeCtx());

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    expect(withRateLimitMock.mock.calls[0]?.[0]).toBe("notion");
  });

  it("notion.queryDatabase redacts api key when Notion returns an error", async () => {
    loadCredentialMock.mockResolvedValueOnce({ apiKey: API_KEY });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ object: "error", message: `Bad key ${API_KEY} rejected` }, 401),
    );

    const handler = getHandler(NOTION_QUERY_DATABASE_TYPE);
    try {
      await handler.execute({ databaseId: DB_ID }, makeCtx());
      throw new Error("expected handler.execute to reject");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).not.toContain(API_KEY);
    }
  });
});
