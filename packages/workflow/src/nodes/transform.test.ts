import { describe, expect, it } from "vitest";

import { transformHandler } from "./transform";
import { makeCtx } from "./_test-ctx";

describe("transformHandler", () => {
  it("maps fields from state via mapping", async () => {
    const out = await transformHandler.execute(
      { mapping: { fullName: "state.user.name", years: "state.user.age" } },
      makeCtx({ state: { user: { name: "Ada", age: 36 } } }),
    );
    expect(out).toEqual({ fullName: "Ada", years: 36 });
  });

  it("applies arrayMap with item scope", async () => {
    const out = await transformHandler.execute(
      { arrayMap: { source: "state.items", expression: "item.id" } },
      makeCtx({ state: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] } }),
    );
    expect(out.mapped).toEqual([1, 2, 3]);
  });

  it("applies arrayFilter with item scope", async () => {
    const out = await transformHandler.execute(
      { arrayFilter: { source: "state.items", expression: "item.active" } },
      makeCtx({
        state: {
          items: [
            { id: 1, active: true },
            { id: 2, active: false },
            { id: 3, active: true },
          ],
        },
      }),
    );
    expect(out.filtered).toEqual([
      { id: 1, active: true },
      { id: 3, active: true },
    ]);
  });

  it("combines mapping + arrayMap + arrayFilter in one call", async () => {
    const out = await transformHandler.execute(
      {
        mapping: { count: "state.items.length" },
        arrayMap: { source: "state.items", expression: "item * 2" },
        arrayFilter: { source: "state.items", expression: "item > 2" },
      },
      makeCtx({ state: { items: [1, 2, 3, 4] } }),
    );
    expect(out).toEqual({ count: 4, mapped: [2, 4, 6, 8], filtered: [3, 4] });
  });

  it("throws when arrayMap source isn't an array", async () => {
    await expect(
      transformHandler.execute(
        { arrayMap: { source: "state.notArray", expression: "item" } },
        makeCtx({ state: { notArray: 42 } }),
      ),
    ).rejects.toThrow(/did not resolve to an array/);
  });

  it("requires at least one operation", () => {
    expect(() => transformHandler.inputSchema.parse({})).toThrow();
  });
});
