import { getHandler, hasHandler, resetRegistry, type ExecutionContext } from "@workflow/workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { withRateLimitMock } = vi.hoisted(() => ({
  withRateLimitMock: vi.fn((_p: string, _t: string, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("../../rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

import {
  TELEGRAM_SEND_MESSAGE_TYPE,
  TELEGRAM_SEND_PHOTO_TYPE,
  registerTelegramNodes,
  telegramHandlers,
} from "./nodes";

const TENANT = "00000000-0000-0000-0000-000000000099";
const BOT_TOKEN = "987654321:abc-DEF_test_token";

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

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("registerTelegramNodes", () => {
  it("registers both telegram handlers in the workflow registry", () => {
    expect(hasHandler(TELEGRAM_SEND_MESSAGE_TYPE)).toBe(false);
    registerTelegramNodes();
    expect(hasHandler(TELEGRAM_SEND_MESSAGE_TYPE)).toBe(true);
    expect(hasHandler(TELEGRAM_SEND_PHOTO_TYPE)).toBe(true);
  });

  it("is idempotent — calling twice does not throw", () => {
    registerTelegramNodes();
    expect(() => registerTelegramNodes()).not.toThrow();
  });

  it("exposes exactly the telegram.sendMessage and telegram.sendPhoto types", () => {
    expect(telegramHandlers.map((h) => h.type).sort()).toEqual(
      [TELEGRAM_SEND_MESSAGE_TYPE, TELEGRAM_SEND_PHOTO_TYPE].sort(),
    );
  });
});

describe("telegram workflow handlers", () => {
  beforeEach(() => {
    registerTelegramNodes();
  });

  it("telegram.sendMessage loads botToken via ctx.loadCredential('telegram') and injects tenantId", async () => {
    loadCredentialMock.mockResolvedValueOnce({ botToken: BOT_TOKEN });
    fetchMock.mockResolvedValueOnce(okResponse({ ok: true, result: { message_id: 1 } }));

    const handler = getHandler(TELEGRAM_SEND_MESSAGE_TYPE);
    const result = await handler.execute({ chatId: "-1001", text: "hi" }, makeCtx());

    expect(result).toEqual({ messageId: 1, ok: true });
    expect(loadCredentialMock).toHaveBeenCalledWith("telegram");

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`);
  });

  it("telegram.sendMessage input schema rejects a botToken param — credential is the only source", () => {
    const handler = getHandler(TELEGRAM_SEND_MESSAGE_TYPE);
    const parsed = handler.inputSchema.safeParse({
      botToken: "leaked-from-workflow-author",
      tenantId: "leaked-tenant",
      chatId: "1",
      text: "hi",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const value = parsed.data as Record<string, unknown>;
      // tenantId is injected by the engine, not accepted from caller
      expect(value).not.toHaveProperty("tenantId");
      // botToken must be stripped/ignored — workflow params can never carry it
      expect(value).not.toHaveProperty("botToken");
    }
  });

  it("telegram.sendMessage throws CredentialNotFoundError when ctx.loadCredential is absent", async () => {
    const handler = getHandler(TELEGRAM_SEND_MESSAGE_TYPE);
    const ctx = makeCtx();
    delete (ctx as { loadCredential?: unknown }).loadCredential;

    await expect(handler.execute({ chatId: "1", text: "hi" }, ctx)).rejects.toThrow(
      /Telegram credential/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("telegram.sendPhoto injects tenantId from ExecutionContext", async () => {
    loadCredentialMock.mockResolvedValueOnce({ botToken: BOT_TOKEN });
    fetchMock.mockResolvedValueOnce(okResponse({ ok: true, result: { message_id: 2 } }));

    const handler = getHandler(TELEGRAM_SEND_PHOTO_TYPE);
    await handler.execute(
      { chatId: "1", photoUrl: "https://example.com/a.png" },
      makeCtx({ tenantId: "tenant-xyz" }),
    );

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    const call = withRateLimitMock.mock.calls[0] as [string, string, () => Promise<unknown>];
    expect(call[0]).toBe("telegram");
    expect(call[1]).toBe("tenant-xyz");
  });

  it("applies rate limiting (withRateLimit is invoked with the telegram key)", async () => {
    loadCredentialMock.mockResolvedValueOnce({ botToken: BOT_TOKEN });
    fetchMock.mockResolvedValueOnce(okResponse({ ok: true, result: { message_id: 3 } }));

    const handler = getHandler(TELEGRAM_SEND_MESSAGE_TYPE);
    await handler.execute({ chatId: "1", text: "hi" }, makeCtx());

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    expect(withRateLimitMock.mock.calls[0]?.[0]).toBe("telegram");
  });
});
