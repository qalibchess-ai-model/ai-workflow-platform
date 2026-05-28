import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { nangoCallMock } = vi.hoisted(() => ({
  nangoCallMock: vi.fn(),
}));

vi.mock("../../nango/client", () => ({
  nangoCall: nangoCallMock,
}));

vi.mock("../../rate-limit", () => ({
  withRateLimit: (_provider: string, _tenant: string, fn: () => Promise<unknown>) => fn(),
}));

import { listMessages, sendEmail } from "./actions";

const TENANT = "00000000-0000-0000-0000-000000000001";

function decodeBase64Url(raw: string): string {
  const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

beforeEach(() => {
  nangoCallMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("sendEmail", () => {
  it("posts a base64url RFC 2822 message to the Gmail send endpoint", async () => {
    nangoCallMock.mockResolvedValueOnce({
      id: "msg_1",
      threadId: "thr_1",
      labelIds: ["SENT"],
    });

    const result = await sendEmail({
      tenantId: TENANT,
      to: "alice@example.com",
      subject: "Hello",
      body: "Hi there",
    });

    expect(result).toEqual({
      messageId: "msg_1",
      threadId: "thr_1",
      labelIds: ["SENT"],
    });

    expect(nangoCallMock).toHaveBeenCalledTimes(1);
    const call = nangoCallMock.mock.calls[0]?.[0] as {
      provider: string;
      method: string;
      endpoint: string;
      tenantId: string;
      data: { raw: string };
    };
    expect(call.provider).toBe("gmail");
    expect(call.method).toBe("POST");
    expect(call.endpoint).toBe("/gmail/v1/users/me/messages/send");
    expect(call.tenantId).toBe(TENANT);

    const decoded = decodeBase64Url(call.data.raw);
    expect(decoded).toContain("To: alice@example.com");
    expect(decoded).toContain("Subject: Hello");
    expect(decoded).toContain("Content-Type: text/plain");
    expect(decoded).toContain("\r\n\r\nHi there");
  });

  it("includes cc and bcc headers and uses html content-type when requested", async () => {
    nangoCallMock.mockResolvedValueOnce({ id: "m", threadId: "t" });

    await sendEmail({
      tenantId: TENANT,
      to: "alice@example.com",
      cc: ["c1@example.com", "c2@example.com"],
      bcc: ["b@example.com"],
      subject: "Subj",
      body: "<p>hi</p>",
      html: true,
    });

    const raw = decodeBase64Url(
      (nangoCallMock.mock.calls[0]?.[0] as { data: { raw: string } }).data.raw,
    );
    expect(raw).toContain("Cc: c1@example.com, c2@example.com");
    expect(raw).toContain("Bcc: b@example.com");
    expect(raw).toContain("Content-Type: text/html");
  });

  it("rejects invalid input", async () => {
    await expect(
      sendEmail({ tenantId: TENANT, to: "not-an-email", subject: "x", body: "y" }),
    ).rejects.toThrow();
    expect(nangoCallMock).not.toHaveBeenCalled();
  });

  it("rejects an upstream response that is missing ids", async () => {
    nangoCallMock.mockResolvedValueOnce({ id: "m" });
    await expect(
      sendEmail({ tenantId: TENANT, to: "a@b.com", subject: "x", body: "y" }),
    ).rejects.toThrow();
  });
});

describe("listMessages", () => {
  it("calls the Gmail list endpoint with query and pagination params", async () => {
    nangoCallMock.mockResolvedValueOnce({
      messages: [{ id: "m1", threadId: "t1" }],
      resultSizeEstimate: 1,
      nextPageToken: "next",
    });

    const result = await listMessages({
      tenantId: TENANT,
      query: "is:unread",
      labelIds: ["INBOX", "IMPORTANT"],
      maxResults: 10,
      pageToken: "tok",
    });

    expect(result).toEqual({
      messages: [{ id: "m1", threadId: "t1" }],
      resultSizeEstimate: 1,
      nextPageToken: "next",
    });

    const call = nangoCallMock.mock.calls[0]?.[0] as {
      method: string;
      endpoint: string;
      params: Record<string, string>;
    };
    expect(call.method).toBe("GET");
    expect(call.endpoint).toBe("/gmail/v1/users/me/messages");
    expect(call.params).toMatchObject({
      maxResults: "10",
      includeSpamTrash: "false",
      q: "is:unread",
      labelIds: "INBOX,IMPORTANT",
      pageToken: "tok",
    });
  });

  it("returns an empty messages array when the API omits the field", async () => {
    nangoCallMock.mockResolvedValueOnce({ resultSizeEstimate: 0 });
    const result = await listMessages({ tenantId: TENANT });
    expect(result.messages).toEqual([]);
    expect(result.resultSizeEstimate).toBe(0);
    expect(result.nextPageToken).toBeUndefined();
  });

  it("rejects when maxResults exceeds the Gmail cap", async () => {
    await expect(listMessages({ tenantId: TENANT, maxResults: 501 })).rejects.toThrow();
    expect(nangoCallMock).not.toHaveBeenCalled();
  });
});
