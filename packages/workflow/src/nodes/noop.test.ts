import { describe, expect, it } from "vitest";

import { noopHandler } from "./noop";

const ctx = {
  runId: "00000000-0000-0000-0000-000000000000",
  workflowId: "00000000-0000-0000-0000-000000000000",
  tenantId: "00000000-0000-0000-0000-000000000000",
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
  },
};

describe("noopHandler", () => {
  it("returns executed=true", async () => {
    const out = await noopHandler.execute({}, ctx);
    expect(out.executed).toBe(true);
  });

  it("echoes the message when provided", async () => {
    const out = await noopHandler.execute({ message: "hi" }, ctx);
    expect(out.message).toBe("hi");
  });
});
