import { getHandler, hasHandler, resetRegistry, type ExecutionContext } from "@workflow/workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { nangoCallMock } = vi.hoisted(() => ({ nangoCallMock: vi.fn() }));

vi.mock("../../nango/client", () => ({
  nangoCall: nangoCallMock,
}));

vi.mock("../../rate-limit", () => ({
  withRateLimit: (_p: string, _t: string, fn: () => Promise<unknown>) => fn(),
}));

import { GMAIL_LIST_TYPE, GMAIL_SEND_TYPE, gmailHandlers, registerGmailNodes } from "./nodes";

const TENANT = "00000000-0000-0000-0000-000000000099";

function makeCtx(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    runId: "run-1",
    workflowId: "wf-1",
    tenantId: TENANT,
    nodeId: "node-1",
    state: {},
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    ...overrides,
  };
}

beforeEach(() => {
  resetRegistry();
  nangoCallMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("registerGmailNodes", () => {
  it("registers both gmail handlers in the workflow registry", () => {
    expect(hasHandler(GMAIL_SEND_TYPE)).toBe(false);
    registerGmailNodes();
    expect(hasHandler(GMAIL_SEND_TYPE)).toBe(true);
    expect(hasHandler(GMAIL_LIST_TYPE)).toBe(true);
  });

  it("is idempotent — calling twice does not throw", () => {
    registerGmailNodes();
    expect(() => registerGmailNodes()).not.toThrow();
  });

  it("exposes exactly the gmail.send and gmail.list types", () => {
    expect(gmailHandlers.map((h) => h.type).sort()).toEqual(
      [GMAIL_LIST_TYPE, GMAIL_SEND_TYPE].sort(),
    );
  });
});

describe("gmail workflow handlers", () => {
  beforeEach(() => {
    registerGmailNodes();
  });

  it("gmail.send injects tenantId from ExecutionContext", async () => {
    nangoCallMock.mockResolvedValueOnce({ id: "m1", threadId: "t1" });
    const handler = getHandler(GMAIL_SEND_TYPE);

    const result = await handler.execute(
      {
        to: "alice@example.com",
        subject: "hi",
        body: "hello",
        html: false,
      },
      makeCtx(),
    );

    expect(result).toMatchObject({ messageId: "m1", threadId: "t1" });
    const call = nangoCallMock.mock.calls[0]?.[0] as { tenantId: string };
    expect(call.tenantId).toBe(TENANT);
  });

  it("gmail.send input schema does not include tenantId", () => {
    const handler = getHandler(GMAIL_SEND_TYPE);
    const parsed = handler.inputSchema.safeParse({
      tenantId: "leaked-from-user",
      to: "a@b.com",
      subject: "x",
      body: "y",
      html: false,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const value = parsed.data as Record<string, unknown>;
      expect(value).not.toHaveProperty("tenantId");
    }
  });

  it("gmail.list injects tenantId from ExecutionContext", async () => {
    nangoCallMock.mockResolvedValueOnce({
      messages: [],
      resultSizeEstimate: 0,
    });
    const handler = getHandler(GMAIL_LIST_TYPE);

    await handler.execute(
      { maxResults: 5, includeSpamTrash: false },
      makeCtx({ tenantId: "tenant-xyz" }),
    );

    const call = nangoCallMock.mock.calls[0]?.[0] as { tenantId: string };
    expect(call.tenantId).toBe("tenant-xyz");
  });
});
