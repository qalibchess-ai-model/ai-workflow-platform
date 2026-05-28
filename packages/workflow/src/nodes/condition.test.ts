import { describe, expect, it } from "vitest";

import { conditionHandler } from "./condition";
import { makeCtx } from "./_test-ctx";

describe("conditionHandler", () => {
  it("evaluates a truthy expression", async () => {
    const out = await conditionHandler.execute(
      { expression: "state.user.age >= 18" },
      makeCtx({ state: { user: { age: 21 } } }),
    );
    expect(out.result).toBe(true);
    expect(out.skip).toEqual([]);
  });

  it("evaluates a falsy expression and returns skipWhenFalse", async () => {
    const out = await conditionHandler.execute(
      { expression: "state.user.active", skipWhenFalse: ["sendEmail", "notify"] },
      makeCtx({ state: { user: { active: false } } }),
    );
    expect(out.result).toBe(false);
    expect(out.skip).toEqual(["sendEmail", "notify"]);
  });

  it("returns skipWhenTrue when truthy", async () => {
    const out = await conditionHandler.execute(
      { expression: "state.flag", skipWhenTrue: ["nodeA"] },
      makeCtx({ state: { flag: 1 } }),
    );
    expect(out.result).toBe(true);
    expect(out.skip).toEqual(["nodeA"]);
  });

  it("wraps expression errors with a clear message", async () => {
    await expect(conditionHandler.execute({ expression: "1 +" }, makeCtx())).rejects.toThrow(
      /Condition expression failed/,
    );
  });

  it("rejects empty expressions at parse time", () => {
    expect(() => conditionHandler.inputSchema.parse({ expression: "" })).toThrow();
  });
});
