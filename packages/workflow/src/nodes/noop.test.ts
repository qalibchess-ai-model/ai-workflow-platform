import { describe, expect, it } from "vitest";

import { noopHandler } from "./noop";
import { makeCtx } from "./_test-ctx";

describe("noopHandler", () => {
  it("returns executed=true", async () => {
    const out = await noopHandler.execute({}, makeCtx());
    expect(out.executed).toBe(true);
  });

  it("echoes the message when provided", async () => {
    const out = await noopHandler.execute({ message: "hi" }, makeCtx());
    expect(out.message).toBe("hi");
  });
});
