import { describe, expect, it } from "vitest";

import { noopAction } from "./actions";

describe("noopAction", () => {
  it("echoes the input message", async () => {
    const result = await noopAction({ message: "hello" });
    expect(result.echoed).toBe("hello");
    expect(typeof result.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it("honors the delay option", async () => {
    const start = Date.now();
    await noopAction({ message: "wait", delay: 25 });
    expect(Date.now() - start).toBeGreaterThanOrEqual(20);
  });

  it("rejects empty messages", async () => {
    await expect(noopAction({ message: "" })).rejects.toThrow();
  });

  it("rejects malformed input", async () => {
    await expect(noopAction({ message: 42 })).rejects.toThrow();
  });
});
