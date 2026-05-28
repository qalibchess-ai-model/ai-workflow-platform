import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { withRateLimitMock } = vi.hoisted(() => ({
  withRateLimitMock: vi.fn((_provider: string, _tenant: string, fn: () => Promise<unknown>) =>
    fn(),
  ),
}));

vi.mock("../../rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

import { sendMessage, uploadFile } from "./actions";

const TENANT = "00000000-0000-0000-0000-000000000001";
const BOT_TOKEN = "xoxb-1111-2222-FAKEslackTOKENforTESTS";

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

function binaryResponse(bytes: Uint8Array, status = 200): Response {
  return new Response(bytes, {
    status,
    headers: { "Content-Type": "application/octet-stream" },
  });
}

describe("sendMessage", () => {
  it("POSTs to chat.postMessage with channel/text and Bearer auth, returns ok+channel+ts", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ok: true, channel: "C123", ts: "1700000000.000100" }),
    );

    const result = await sendMessage(
      { tenantId: TENANT, channel: "#general", text: "hello" },
      BOT_TOKEN,
    );

    expect(result).toEqual({ ok: true, channel: "C123", ts: "1700000000.000100" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://slack.com/api/chat.postMessage");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(`Bearer ${BOT_TOKEN}`);
    expect(headers["Content-Type"]).toContain("application/json");
    expect(JSON.parse(init.body as string)).toEqual({
      channel: "#general",
      text: "hello",
    });
  });

  it("forwards blocks when provided", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, channel: "C1", ts: "1.2" }));

    const blocks = [{ type: "section", text: { type: "mrkdwn", text: "*hi*" } }];
    await sendMessage({ tenantId: TENANT, channel: "C1", text: "hi", blocks }, BOT_TOKEN);

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({ channel: "C1", text: "hi", blocks });
  });

  it("rejects when input schema fails (e.g. tenantId missing) without calling fetch", async () => {
    await expect(sendMessage({ channel: "C1", text: "hi" }, BOT_TOKEN)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects empty text", async () => {
    await expect(
      sendMessage({ tenantId: TENANT, channel: "C1", text: "" }, BOT_TOKEN),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces Slack API errors and redacts the bot token", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ok: false, error: `invalid_auth ${BOT_TOKEN}` }),
    );

    try {
      await sendMessage({ tenantId: TENANT, channel: "C1", text: "hi" }, BOT_TOKEN);
      throw new Error("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toMatch(/Slack API error/);
      expect(msg).not.toContain(BOT_TOKEN);
    }
  });

  it("goes through withRateLimit using the slack provider key and tenantId", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, channel: "C1", ts: "1.2" }));

    await sendMessage({ tenantId: TENANT, channel: "C1", text: "hi" }, BOT_TOKEN);

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    const call = withRateLimitMock.mock.calls[0] as [string, string, () => Promise<unknown>];
    expect(call[0]).toBe("slack");
    expect(call[1]).toBe(TENANT);
  });

  it("throws when Slack returns ok=true but missing channel/ts", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await expect(
      sendMessage({ tenantId: TENANT, channel: "C1", text: "hi" }, BOT_TOKEN),
    ).rejects.toThrow(/missing channel\/ts/);
  });
});

describe("uploadFile", () => {
  it("runs the 4-step external upload flow and returns fileId", async () => {
    fetchMock
      .mockResolvedValueOnce(binaryResponse(new Uint8Array([1, 2, 3, 4])))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          upload_url: "https://files.slack.com/upload/v1/ABC",
          file_id: "F999",
        }),
      )
      .mockResolvedValueOnce(new Response("OK", { status: 200 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, files: [{ id: "F999" }] }));

    const result = await uploadFile(
      {
        tenantId: TENANT,
        channel: "C1",
        fileUrl: "https://example.com/report.pdf",
        title: "Q4 report",
      },
      BOT_TOKEN,
    );

    expect(result).toEqual({ ok: true, fileId: "F999" });
    expect(fetchMock).toHaveBeenCalledTimes(4);

    // Step 1: download source
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe("https://example.com/report.pdf");

    // Step 2: reserve upload URL with filename + length
    const [reserveUrl, reserveInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(reserveUrl).toBe(
      "https://slack.com/api/files.getUploadURLExternal?filename=report.pdf&length=4",
    );
    expect(reserveInit.method).toBe("GET");
    expect((reserveInit.headers as Record<string, string>)["Authorization"]).toBe(
      `Bearer ${BOT_TOKEN}`,
    );

    // Step 3: POST bytes to upload_url — bot token must NOT appear here
    const [putUrl, putInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(putUrl).toBe("https://files.slack.com/upload/v1/ABC");
    expect(putInit.method).toBe("POST");
    const putHeaders = (putInit.headers ?? {}) as Record<string, string>;
    expect(putHeaders["Authorization"]).toBeUndefined();

    // Step 4: completeUploadExternal with channel + file id + title
    const [completeUrl, completeInit] = fetchMock.mock.calls[3] as [string, RequestInit];
    expect(completeUrl).toBe("https://slack.com/api/files.completeUploadExternal");
    const body = JSON.parse(completeInit.body as string) as Record<string, unknown>;
    expect(body).toEqual({
      files: [{ id: "F999", title: "Q4 report" }],
      channel_id: "C1",
    });
  });

  it("rejects non-URL fileUrl without calling fetch", async () => {
    await expect(
      uploadFile({ tenantId: TENANT, channel: "C1", fileUrl: "not-a-url" }, BOT_TOKEN),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redacts the bot token when files.getUploadURLExternal errors", async () => {
    fetchMock
      .mockResolvedValueOnce(binaryResponse(new Uint8Array([1])))
      .mockResolvedValueOnce(jsonResponse({ ok: false, error: `bad_token ${BOT_TOKEN}` }));

    try {
      await uploadFile(
        {
          tenantId: TENANT,
          channel: "C1",
          fileUrl: "https://example.com/x.bin",
        },
        BOT_TOKEN,
      );
      throw new Error("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toMatch(/files.getUploadURLExternal/);
      expect(msg).not.toContain(BOT_TOKEN);
    }
  });

  it("rate limits per tenant on the slack key", async () => {
    fetchMock
      .mockResolvedValueOnce(binaryResponse(new Uint8Array([1])))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          upload_url: "https://files.slack.com/u/1",
          file_id: "F1",
        }),
      )
      .mockResolvedValueOnce(new Response("OK", { status: 200 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await uploadFile(
      { tenantId: TENANT, channel: "C1", fileUrl: "https://example.com/y.bin" },
      BOT_TOKEN,
    );
    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    expect(withRateLimitMock.mock.calls[0]?.[0]).toBe("slack");
    expect(withRateLimitMock.mock.calls[0]?.[1]).toBe(TENANT);
  });
});
