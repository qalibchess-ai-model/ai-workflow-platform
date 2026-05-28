import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { httpRequestHandler } from "./http-request";
import { makeCtx } from "./_test-ctx";

const originalFetch = global.fetch;

function mockFetchOnce(response: {
  status?: number;
  ok?: boolean;
  body?: unknown;
  headers?: Record<string, string>;
  json?: boolean;
}): ReturnType<typeof vi.fn> {
  const headers = new Headers({
    "content-type": response.json === false ? "text/plain" : "application/json",
    ...response.headers,
  });
  const fetchMock = vi.fn().mockResolvedValue({
    status: response.status ?? 200,
    ok: response.ok ?? true,
    headers,
    json: async () => response.body,
    text: async () =>
      typeof response.body === "string" ? response.body : JSON.stringify(response.body),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("httpRequestHandler", () => {
  it("sends a GET request and parses JSON", async () => {
    const fetchMock = mockFetchOnce({ body: { hello: "world" } });
    const out = await httpRequestHandler.execute(
      { url: "https://api.test/users", method: "GET", timeoutMs: 5000, expectJson: true },
      makeCtx(),
    );
    expect(out.status).toBe(200);
    expect(out.ok).toBe(true);
    expect(out.body).toEqual({ hello: "world" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/users",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("appends query params", async () => {
    const fetchMock = mockFetchOnce({ body: {} });
    await httpRequestHandler.execute(
      {
        url: "https://api.test/users",
        method: "GET",
        query: { id: 5, active: true },
        timeoutMs: 5000,
        expectJson: true,
      },
      makeCtx(),
    );
    const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("id=5");
    expect(calledUrl).toContain("active=true");
  });

  it("serializes JSON body for POST and adds content-type", async () => {
    const fetchMock = mockFetchOnce({ body: { created: true } });
    await httpRequestHandler.execute(
      {
        url: "https://api.test/users",
        method: "POST",
        body: { name: "Ada" },
        timeoutMs: 5000,
        expectJson: true,
      },
      makeCtx(),
    );
    const opts = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(opts.body).toBe(JSON.stringify({ name: "Ada" }));
    expect((opts.headers as Record<string, string>)["content-type"]).toBe("application/json");
  });

  it("returns text body when expectJson=false", async () => {
    mockFetchOnce({ body: "plain text", json: false });
    const out = await httpRequestHandler.execute(
      { url: "https://api.test/x", method: "GET", timeoutMs: 5000, expectJson: false },
      makeCtx(),
    );
    expect(out.body).toBe("plain text");
  });

  it("rejects malformed URLs at schema parse time", () => {
    expect(() => httpRequestHandler.inputSchema.parse({ url: "not-a-url" })).toThrow();
  });

  it("throws a clear error on timeout", async () => {
    const abortErr = Object.assign(new Error("aborted"), { name: "AbortError" });
    global.fetch = vi.fn().mockRejectedValue(abortErr) as unknown as typeof fetch;
    await expect(
      httpRequestHandler.execute(
        { url: "https://api.test/slow", method: "GET", timeoutMs: 10, expectJson: true },
        makeCtx(),
      ),
    ).rejects.toThrow(/timed out/);
  });
});

beforeEach(() => {
  // ensure clean fetch reference before each test
  global.fetch = originalFetch;
});
