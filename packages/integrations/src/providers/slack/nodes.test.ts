import { getHandler, hasHandler, resetRegistry, type ExecutionContext } from "@workflow/workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { withRateLimitMock } = vi.hoisted(() => ({
  withRateLimitMock: vi.fn((_p: string, _t: string, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("../../rate-limit", () => ({
  withRateLimit: withRateLimitMock,
}));

import {
  SLACK_SEND_MESSAGE_TYPE,
  SLACK_UPLOAD_FILE_TYPE,
  registerSlackNodes,
  slackHandlers,
} from "./nodes";

const TENANT = "00000000-0000-0000-0000-000000000099";
const BOT_TOKEN = "xoxb-9999-8888-TESTslackTOKEN";

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

describe("registerSlackNodes", () => {
  it("registers both slack handlers in the workflow registry", () => {
    expect(hasHandler(SLACK_SEND_MESSAGE_TYPE)).toBe(false);
    registerSlackNodes();
    expect(hasHandler(SLACK_SEND_MESSAGE_TYPE)).toBe(true);
    expect(hasHandler(SLACK_UPLOAD_FILE_TYPE)).toBe(true);
  });

  it("is idempotent — calling twice does not throw", () => {
    registerSlackNodes();
    expect(() => registerSlackNodes()).not.toThrow();
  });

  it("exposes exactly the slack.sendMessage and slack.uploadFile types", () => {
    expect(slackHandlers.map((h) => h.type).sort()).toEqual(
      [SLACK_SEND_MESSAGE_TYPE, SLACK_UPLOAD_FILE_TYPE].sort(),
    );
  });
});

describe("slack workflow handlers", () => {
  beforeEach(() => {
    registerSlackNodes();
  });

  it("slack.sendMessage loads botToken via ctx.loadCredential('slack') and injects tenantId", async () => {
    loadCredentialMock.mockResolvedValueOnce({ botToken: BOT_TOKEN });
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, channel: "C1", ts: "1.2" }));

    const handler = getHandler(SLACK_SEND_MESSAGE_TYPE);
    const result = await handler.execute({ channel: "C1", text: "hi" }, makeCtx());

    expect(result).toEqual({ ok: true, channel: "C1", ts: "1.2" });
    expect(loadCredentialMock).toHaveBeenCalledWith("slack");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://slack.com/api/chat.postMessage");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(`Bearer ${BOT_TOKEN}`);
  });

  it("slack.sendMessage input schema strips tenantId and botToken — credential is the only source", () => {
    const handler = getHandler(SLACK_SEND_MESSAGE_TYPE);
    const parsed = handler.inputSchema.safeParse({
      botToken: "leaked-from-workflow-author",
      tenantId: "leaked-tenant",
      channel: "C1",
      text: "hi",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const value = parsed.data as Record<string, unknown>;
      expect(value).not.toHaveProperty("tenantId");
      expect(value).not.toHaveProperty("botToken");
    }
  });

  it("slack.sendMessage throws CredentialNotFoundError when ctx.loadCredential is absent", async () => {
    const handler = getHandler(SLACK_SEND_MESSAGE_TYPE);
    const ctx = makeCtx();
    delete (ctx as { loadCredential?: unknown }).loadCredential;

    await expect(handler.execute({ channel: "C1", text: "hi" }, ctx)).rejects.toThrow(
      /Slack credential/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("slack.uploadFile injects tenantId from ExecutionContext", async () => {
    loadCredentialMock.mockResolvedValueOnce({ botToken: BOT_TOKEN });
    fetchMock
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2]), { status: 200 }))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          upload_url: "https://files.slack.com/upload/v1/ABC",
          file_id: "F1",
        }),
      )
      .mockResolvedValueOnce(new Response("OK", { status: 200 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const handler = getHandler(SLACK_UPLOAD_FILE_TYPE);
    await handler.execute(
      { channel: "C1", fileUrl: "https://example.com/a.bin" },
      makeCtx({ tenantId: "tenant-xyz" }),
    );

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    const call = withRateLimitMock.mock.calls[0] as [string, string, () => Promise<unknown>];
    expect(call[0]).toBe("slack");
    expect(call[1]).toBe("tenant-xyz");
  });

  it("applies rate limiting (withRateLimit invoked with the slack key)", async () => {
    loadCredentialMock.mockResolvedValueOnce({ botToken: BOT_TOKEN });
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, channel: "C1", ts: "1.2" }));

    const handler = getHandler(SLACK_SEND_MESSAGE_TYPE);
    await handler.execute({ channel: "C1", text: "hi" }, makeCtx());

    expect(withRateLimitMock).toHaveBeenCalledTimes(1);
    expect(withRateLimitMock.mock.calls[0]?.[0]).toBe("slack");
  });
});
