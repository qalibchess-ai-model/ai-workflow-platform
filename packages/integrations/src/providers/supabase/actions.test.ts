import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { withRateLimitMock } = vi.hoisted(() => ({
  withRateLimitMock: vi.fn((_provider: string, _tenant: string, fn: () => Promise<unknown>) =>
    fn(),
  ),
}));

vi.mock("../../rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

import { insertRow, selectRows } from "./actions";

const TENANT = "00000000-0000-0000-0000-000000000001";
const AUTH = {
  url: "https://project.supabase.co",
  serviceKey: "service-role-key-VERY-secret-1234567890",
};

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

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("insertRow", () => {
  it("POSTs JSON to /rest/v1/<table> with apikey + Bearer headers and Prefer=return=representation", async () => {
    const row = { id: 42, name: "Ada" };
    fetchMock.mockResolvedValueOnce(jsonResponse([row], { status: 201 }));

    const result = await insertRow(
      { tenantId: TENANT, table: "users", data: { name: "Ada" } },
      AUTH,
    );

    expect(result).toEqual({ rows: [row], count: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://project.supabase.co/rest/v1/users");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.apikey).toBe(AUTH.serviceKey);
    expect(headers.Authorization).toBe(`Bearer ${AUTH.serviceKey}`);
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Prefer).toBe("return=representation");
    expect(init.body).toBe(JSON.stringify({ name: "Ada" }));
  });

  it("supports batch insert (array of rows)", async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    fetchMock.mockResolvedValueOnce(jsonResponse(rows, { status: 201 }));

    const result = await insertRow(
      {
        tenantId: TENANT,
        table: "users",
        data: [{ name: "a" }, { name: "b" }],
      },
      AUTH,
    );

    expect(result.count).toBe(2);
    expect(result.rows).toEqual(rows);
  });

  it("trims trailing slash from the credential URL", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 1 }], { status: 201 }));

    await insertRow(
      { tenantId: TENANT, table: "users", data: { name: "x" } },
      { url: "https://project.supabase.co/", serviceKey: AUTH.serviceKey },
    );

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://project.supabase.co/rest/v1/users");
  });

  it("rejects invalid table identifiers (SQL injection / path traversal)", async () => {
    await expect(
      insertRow({ tenantId: TENANT, table: "users; drop table", data: { x: 1 } }, AUTH),
    ).rejects.toThrow();
    await expect(
      insertRow({ tenantId: TENANT, table: "../secret", data: { x: 1 } }, AUTH),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects when tenantId is missing without calling fetch", async () => {
    await expect(insertRow({ table: "users", data: { x: 1 } }, AUTH)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces PostgREST errors but redacts the service key from error text", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: `Invalid token ${AUTH.serviceKey} for project`,
          code: "PGRST301",
          details: `Bearer ${AUTH.serviceKey} not accepted`,
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );

    try {
      await insertRow({ tenantId: TENANT, table: "users", data: { x: 1 } }, AUTH);
      throw new Error("should have rejected");
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toMatch(/Supabase API error/);
      expect(message).not.toContain(AUTH.serviceKey);
      expect(message).toContain("***");
    }
  });

  it("redacts the service key from network error messages", async () => {
    fetchMock.mockRejectedValueOnce(
      new Error(`connect ECONNREFUSED with ${AUTH.serviceKey} in trace`),
    );

    try {
      await insertRow({ tenantId: TENANT, table: "users", data: { x: 1 } }, AUTH);
      throw new Error("should have rejected");
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toMatch(/Supabase request failed/);
      expect(message).not.toContain(AUTH.serviceKey);
    }
  });

  it("goes through withRateLimit using the supabase provider key", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 1 }], { status: 201 }));

    await insertRow({ tenantId: TENANT, table: "users", data: { x: 1 } }, AUTH);

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    const call = withRateLimitMock.mock.calls[0] as [string, string, () => Promise<unknown>];
    expect(call[0]).toBe("supabase");
    expect(call[1]).toBe(TENANT);
  });
});

describe("selectRows", () => {
  it("GETs /rest/v1/<table> with apikey + Bearer headers and no body", async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    fetchMock.mockResolvedValueOnce(jsonResponse(rows));

    const result = await selectRows({ tenantId: TENANT, table: "users" }, AUTH);

    expect(result).toEqual({ rows, count: 2 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://project.supabase.co/rest/v1/users");
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    const headers = init.headers as Record<string, string>;
    expect(headers.apikey).toBe(AUTH.serviceKey);
    expect(headers.Authorization).toBe(`Bearer ${AUTH.serviceKey}`);
  });

  it("encodes filter as PostgREST querystring", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 5 }]));

    await selectRows(
      {
        tenantId: TENANT,
        table: "users",
        filter: { id: "eq.5", status: "in.(active,pending)" },
        limit: 10,
      },
      AUTH,
    );

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url.startsWith("https://project.supabase.co/rest/v1/users?")).toBe(true);
    const qs = new URL(url).searchParams;
    expect(qs.get("id")).toBe("eq.5");
    expect(qs.get("status")).toBe("in.(active,pending)");
    expect(qs.get("limit")).toBe("10");
  });

  it("does not append querystring when filter and limit are absent", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await selectRows({ tenantId: TENANT, table: "users" }, AUTH);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://project.supabase.co/rest/v1/users");
  });

  it("rejects filter keys that are not valid SQL identifiers", async () => {
    await expect(
      selectRows(
        {
          tenantId: TENANT,
          table: "users",
          filter: { "id; drop": "eq.1" },
        },
        AUTH,
      ),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects limit out of range", async () => {
    await expect(
      selectRows({ tenantId: TENANT, table: "users", limit: 0 }, AUTH),
    ).rejects.toThrow();
    await expect(
      selectRows({ tenantId: TENANT, table: "users", limit: 1001 }, AUTH),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws when response is not a JSON array", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ not: "an array" }));

    await expect(selectRows({ tenantId: TENANT, table: "users" }, AUTH)).rejects.toThrow(
      /not a JSON array/,
    );
  });

  it("rate limits per tenant", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await selectRows({ tenantId: TENANT, table: "users" }, AUTH);

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    expect(withRateLimitMock.mock.calls[0]?.[0]).toBe("supabase");
    expect(withRateLimitMock.mock.calls[0]?.[1]).toBe(TENANT);
  });
});
