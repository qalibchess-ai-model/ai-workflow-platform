import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { withRateLimitMock } = vi.hoisted(() => ({
  withRateLimitMock: vi.fn((_provider: string, _tenant: string, fn: () => Promise<unknown>) =>
    fn(),
  ),
}));

vi.mock("../../rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

import { createPage, queryDatabase } from "./actions";

const TENANT = "00000000-0000-0000-0000-000000000001";
const API_KEY = "secret_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890";
const DB_ID = "abcdef01234567890abcdef012345678";
const PAGE_ID = "11111111-2222-3333-4444-555555555555";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
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

describe("createPage", () => {
  it("POSTs to /v1/pages with parent.database_id, properties, and Bearer auth", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: PAGE_ID,
        url: `https://www.notion.so/${PAGE_ID.replace(/-/g, "")}`,
      }),
    );

    const result = await createPage(
      {
        tenantId: TENANT,
        databaseId: DB_ID,
        properties: { Name: { title: [{ text: { content: "hello" } }] } },
      },
      API_KEY,
    );

    expect(result).toEqual({
      pageId: PAGE_ID,
      url: `https://www.notion.so/${PAGE_ID.replace(/-/g, "")}`,
      ok: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.notion.com/v1/pages");
    expect(init.method).toBe("POST");

    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${API_KEY}`);
    expect(headers["Notion-Version"]).toBe("2022-06-28");
    expect(headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({
      parent: { database_id: DB_ID },
      properties: { Name: { title: [{ text: { content: "hello" } }] } },
    });
    expect(body).not.toHaveProperty("children");
  });

  it("attaches `content` as a paragraph block under children", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: PAGE_ID }));

    await createPage(
      {
        tenantId: TENANT,
        databaseId: DB_ID,
        properties: { Name: { title: [{ text: { content: "x" } }] } },
        content: "the body text",
      },
      API_KEY,
    );

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.children).toEqual([
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: "the body text" } }],
        },
      },
    ]);
  });

  it("falls back to a notion.so URL when the response omits `url`", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: PAGE_ID }));
    const result = await createPage(
      {
        tenantId: TENANT,
        databaseId: DB_ID,
        properties: {},
      },
      API_KEY,
    );
    expect(result.url).toBe(`https://www.notion.so/${PAGE_ID.replace(/-/g, "")}`);
  });

  it("rejects when tenantId is missing without calling fetch", async () => {
    await expect(createPage({ databaseId: DB_ID, properties: {} }, API_KEY)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed databaseId without calling fetch", async () => {
    await expect(
      createPage({ tenantId: TENANT, databaseId: "too-short", properties: {} }, API_KEY),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces Notion API errors but redacts the api key", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          object: "error",
          message: `Invalid token ${API_KEY} provided`,
        },
        401,
      ),
    );

    try {
      await createPage({ tenantId: TENANT, databaseId: DB_ID, properties: {} }, API_KEY);
      throw new Error("expected createPage to reject");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toMatch(/Notion API error/);
      expect((err as Error).message).not.toContain(API_KEY);
    }
  });

  it("goes through withRateLimit using the notion provider key", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: PAGE_ID }));

    await createPage({ tenantId: TENANT, databaseId: DB_ID, properties: {} }, API_KEY);

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    const call = withRateLimitMock.mock.calls[0] as [string, string, () => Promise<unknown>];
    expect(call[0]).toBe("notion");
    expect(call[1]).toBe(TENANT);
  });
});

describe("queryDatabase", () => {
  it("POSTs to /v1/databases/{id}/query with empty body when no filter", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ results: [], next_cursor: null, has_more: false }),
    );

    const result = await queryDatabase({ tenantId: TENANT, databaseId: DB_ID }, API_KEY);

    expect(result).toEqual({ results: [], nextCursor: null, hasMore: false });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://api.notion.com/v1/databases/${DB_ID}/query`);
    expect(JSON.parse(init.body as string)).toEqual({});
  });

  it("forwards filter, pageSize, startCursor with snake_case keys", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ results: [], next_cursor: null, has_more: false }),
    );

    await queryDatabase(
      {
        tenantId: TENANT,
        databaseId: DB_ID,
        filter: { property: "Status", select: { equals: "Done" } },
        pageSize: 50,
        startCursor: "cursor-xyz",
      },
      API_KEY,
    );

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      filter: { property: "Status", select: { equals: "Done" } },
      page_size: 50,
      start_cursor: "cursor-xyz",
    });
  });

  it("maps results to {id, url, properties} and preserves next_cursor / has_more", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: [
          {
            id: PAGE_ID,
            url: "https://www.notion.so/page-1",
            properties: { Name: { title: [] } },
          },
          { id: "another-page-id-1234567890abcdef" },
        ],
        next_cursor: "cursor-next",
        has_more: true,
      }),
    );

    const result = await queryDatabase({ tenantId: TENANT, databaseId: DB_ID }, API_KEY);

    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toEqual({
      id: PAGE_ID,
      url: "https://www.notion.so/page-1",
      properties: { Name: { title: [] } },
    });
    expect(result.results[1]).toEqual({
      id: "another-page-id-1234567890abcdef",
      url: undefined,
      properties: undefined,
    });
    expect(result.nextCursor).toBe("cursor-next");
    expect(result.hasMore).toBe(true);
  });

  it("rejects pageSize > 100 without calling fetch", async () => {
    await expect(
      queryDatabase({ tenantId: TENANT, databaseId: DB_ID, pageSize: 200 }, API_KEY),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rate limits per tenant", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ results: [], next_cursor: null, has_more: false }),
    );

    await queryDatabase({ tenantId: TENANT, databaseId: DB_ID }, API_KEY);

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    expect(withRateLimitMock.mock.calls[0]?.[0]).toBe("notion");
    expect(withRateLimitMock.mock.calls[0]?.[1]).toBe(TENANT);
  });
});
