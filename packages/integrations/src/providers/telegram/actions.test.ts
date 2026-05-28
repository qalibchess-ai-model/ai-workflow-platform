import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { withRateLimitMock } = vi.hoisted(() => ({
  withRateLimitMock: vi.fn((_provider: string, _tenant: string, fn: () => Promise<unknown>) =>
    fn(),
  ),
}));

vi.mock("../../rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

import { sendMessage, sendPhoto } from "./actions";

const TENANT = "00000000-0000-0000-0000-000000000001";
const BOT_TOKEN = "123456789:AAEhBOTtokenFAKE-string_for-tests";

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

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("sendMessage", () => {
  it("posts to bot<TOKEN>/sendMessage with chat_id and text, returns messageId", async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ ok: true, result: { message_id: 42 } }));

    const result = await sendMessage(
      { tenantId: TENANT, chatId: "-1001234567890", text: "hi there" },
      BOT_TOKEN,
    );

    expect(result).toEqual({ messageId: 42, ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ chat_id: "-1001234567890", text: "hi there" });
    // bot token must not appear in the request body — only in the URL path
    expect(init.body as string).not.toContain(BOT_TOKEN);
  });

  it("forwards parseMode and disableWebPagePreview when provided", async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ ok: true, result: { message_id: 7 } }));

    await sendMessage(
      {
        tenantId: TENANT,
        chatId: "@channel",
        text: "<b>hi</b>",
        parseMode: "HTML",
        disableWebPagePreview: true,
      },
      BOT_TOKEN,
    );

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      chat_id: "@channel",
      text: "<b>hi</b>",
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  });

  it("rejects when input schema fails (e.g. tenantId missing) without calling fetch", async () => {
    await expect(sendMessage({ chatId: "1", text: "x" }, BOT_TOKEN)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects empty text and overly long text", async () => {
    await expect(
      sendMessage({ tenantId: TENANT, chatId: "1", text: "" }, BOT_TOKEN),
    ).rejects.toThrow();
    await expect(
      sendMessage({ tenantId: TENANT, chatId: "1", text: "a".repeat(4097) }, BOT_TOKEN),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces Telegram API errors but redacts the bot token", async () => {
    fetchMock.mockResolvedValueOnce(
      okResponse({
        ok: false,
        description: `Bad token ${BOT_TOKEN} used in some message`,
      }),
    );

    await expect(
      sendMessage({ tenantId: TENANT, chatId: "1", text: "hi" }, BOT_TOKEN),
    ).rejects.toThrow(/Telegram API error/);

    try {
      await sendMessage({ tenantId: TENANT, chatId: "1", text: "hi" }, BOT_TOKEN);
    } catch (err) {
      expect((err as Error).message).not.toContain(BOT_TOKEN);
    }
  });

  it("goes through withRateLimit using the telegram provider key", async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ ok: true, result: { message_id: 1 } }));

    await sendMessage({ tenantId: TENANT, chatId: "1", text: "hi" }, BOT_TOKEN);

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    const call = withRateLimitMock.mock.calls[0] as [string, string, () => Promise<unknown>];
    expect(call[0]).toBe("telegram");
    expect(call[1]).toBe(TENANT);
  });
});

describe("sendPhoto", () => {
  it("posts photo URL and caption to sendPhoto endpoint", async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ ok: true, result: { message_id: 99 } }));

    const result = await sendPhoto(
      {
        tenantId: TENANT,
        chatId: "12345",
        photoUrl: "https://example.com/cat.png",
        caption: "look",
      },
      BOT_TOKEN,
    );

    expect(result).toEqual({ messageId: 99, ok: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`);
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({
      chat_id: "12345",
      photo: "https://example.com/cat.png",
      caption: "look",
    });
  });

  it("rejects non-URL photoUrl", async () => {
    await expect(
      sendPhoto({ tenantId: TENANT, chatId: "1", photoUrl: "not-a-url" }, BOT_TOKEN),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rate limits per tenant", async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ ok: true, result: { message_id: 1 } }));
    await sendPhoto(
      { tenantId: TENANT, chatId: "1", photoUrl: "https://example.com/x.png" },
      BOT_TOKEN,
    );
    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    expect(withRateLimitMock.mock.calls[0]?.[0]).toBe("telegram");
  });
});
