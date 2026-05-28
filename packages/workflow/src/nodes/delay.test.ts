import { describe, expect, it } from "vitest";

import { delayHandler } from "./delay";
import { makeCtx } from "./_test-ctx";

describe("delayHandler", () => {
  it("waits for the requested duration (small)", async () => {
    const start = Date.now();
    const out = await delayHandler.execute({ durationMs: 30 }, makeCtx());
    const elapsed = Date.now() - start;
    expect(out).toEqual({ delayed: true, durationMs: 30 });
    expect(elapsed).toBeGreaterThanOrEqual(20);
  });

  it("rejects invalid duration via schema", () => {
    expect(() => delayHandler.inputSchema.parse({ durationMs: -1 })).toThrow();
    expect(() => delayHandler.inputSchema.parse({ durationMs: 0 })).toThrow();
    expect(() => delayHandler.inputSchema.parse({})).toThrow();
  });

  it("rejects durations beyond the cap", () => {
    expect(() => delayHandler.inputSchema.parse({ durationMs: 8 * 24 * 60 * 60 * 1000 })).toThrow();
  });
});
