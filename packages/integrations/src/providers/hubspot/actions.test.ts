import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { withRateLimitMock } = vi.hoisted(() => ({
  withRateLimitMock: vi.fn((_provider: string, _tenant: string, fn: () => Promise<unknown>) =>
    fn(),
  ),
}));

vi.mock("../../rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

import { createContact, createDeal } from "./actions";

const TENANT = "00000000-0000-0000-0000-000000000001";
const ACCESS_TOKEN = "pat-na1-FAKE-hubspot-token-for-tests-0000";

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

describe("createContact", () => {
  it("posts to /crm/v3/objects/contacts with bearer auth and returns mapped output", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "12345",
        properties: { email: "jane@example.com", firstname: "Jane", lastname: "Doe" },
        createdAt: "2026-05-28T12:34:56.000Z",
      }),
    );

    const result = await createContact(
      {
        tenantId: TENANT,
        email: "jane@example.com",
        firstName: "Jane",
        lastName: "Doe",
      },
      ACCESS_TOKEN,
    );

    expect(result).toEqual({
      contactId: "12345",
      email: "jane@example.com",
      createdAt: "2026-05-28T12:34:56.000Z",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.hubapi.com/crm/v3/objects/contacts");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
    expect(headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(init.body as string) as { properties: Record<string, string> };
    expect(body.properties).toEqual({
      email: "jane@example.com",
      firstname: "Jane",
      lastname: "Doe",
    });
    // bearer token must not appear inside the JSON body — only in the header
    expect(init.body as string).not.toContain(ACCESS_TOKEN);
  });

  it("forwards extra properties through the property bag", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "1",
        properties: { email: "x@y.com" },
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );

    await createContact(
      {
        tenantId: TENANT,
        email: "x@y.com",
        properties: { company: "Acme", lifecyclestage: "lead", revenue: 1500 },
      },
      ACCESS_TOKEN,
    );

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as { properties: Record<string, string> };
    expect(body.properties).toMatchObject({
      email: "x@y.com",
      company: "Acme",
      lifecyclestage: "lead",
      revenue: "1500",
    });
  });

  it("rejects when input schema fails (tenantId missing) without calling fetch", async () => {
    await expect(createContact({ email: "x@y.com" }, ACCESS_TOKEN)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invalid email without calling fetch", async () => {
    await expect(
      createContact({ tenantId: TENANT, email: "not-an-email" }, ACCESS_TOKEN),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces HubSpot API errors with status and redacts the access token", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          status: "error",
          message: `Invalid token ${ACCESS_TOKEN} seen in upstream message`,
          category: "INVALID_AUTHENTICATION",
        },
        401,
      ),
    );

    let captured: Error | undefined;
    try {
      await createContact({ tenantId: TENANT, email: "x@y.com" }, ACCESS_TOKEN);
    } catch (err) {
      captured = err as Error;
    }

    expect(captured).toBeDefined();
    expect(captured?.message).toMatch(/HubSpot API error/);
    expect(captured?.message).toContain("401");
    expect(captured?.message).not.toContain(ACCESS_TOKEN);
  });

  it("goes through withRateLimit using the hubspot provider key", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "1",
        properties: { email: "x@y.com" },
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );

    await createContact({ tenantId: TENANT, email: "x@y.com" }, ACCESS_TOKEN);

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    const call = withRateLimitMock.mock.calls[0] as [string, string, () => Promise<unknown>];
    expect(call[0]).toBe("hubspot");
    expect(call[1]).toBe(TENANT);
  });
});

describe("createDeal", () => {
  it("posts to /crm/v3/objects/deals with dealname/amount/stage", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "55",
        properties: {
          dealname: "Enterprise Q3",
          amount: "5000",
          dealstage: "presentationscheduled",
        },
        createdAt: "2026-05-28T10:00:00.000Z",
      }),
    );

    const result = await createDeal(
      {
        tenantId: TENANT,
        dealName: "Enterprise Q3",
        amount: 5000,
        stage: "presentationscheduled",
      },
      ACCESS_TOKEN,
    );

    expect(result).toEqual({
      dealId: "55",
      dealName: "Enterprise Q3",
      createdAt: "2026-05-28T10:00:00.000Z",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.hubapi.com/crm/v3/objects/deals");
    const body = JSON.parse(init.body as string) as { properties: Record<string, string> };
    expect(body.properties).toEqual({
      dealname: "Enterprise Q3",
      amount: "5000",
      dealstage: "presentationscheduled",
    });
  });

  it("omits amount and stage from properties when not provided", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "56",
        properties: { dealname: "Minimal" },
        createdAt: "2026-05-28T10:00:00.000Z",
      }),
    );

    await createDeal({ tenantId: TENANT, dealName: "Minimal" }, ACCESS_TOKEN);

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as { properties: Record<string, string> };
    expect(body.properties).toEqual({ dealname: "Minimal" });
  });

  it("rejects negative amount and empty dealName without calling fetch", async () => {
    await expect(createDeal({ tenantId: TENANT, dealName: "" }, ACCESS_TOKEN)).rejects.toThrow();
    await expect(
      createDeal({ tenantId: TENANT, dealName: "valid", amount: -1 }, ACCESS_TOKEN),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rate limits per tenant under the hubspot key", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "1",
        properties: { dealname: "d" },
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );

    await createDeal({ tenantId: TENANT, dealName: "d" }, ACCESS_TOKEN);

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    expect(withRateLimitMock.mock.calls[0]?.[0]).toBe("hubspot");
  });

  it("redacts access token from network-layer errors", async () => {
    fetchMock.mockRejectedValueOnce(new Error(`connect ECONNREFUSED while using ${ACCESS_TOKEN}`));

    let captured: Error | undefined;
    try {
      await createDeal({ tenantId: TENANT, dealName: "d" }, ACCESS_TOKEN);
    } catch (err) {
      captured = err as Error;
    }

    expect(captured).toBeDefined();
    expect(captured?.message).not.toContain(ACCESS_TOKEN);
    expect(captured?.message).toMatch(/HubSpot request failed/);
  });
});
