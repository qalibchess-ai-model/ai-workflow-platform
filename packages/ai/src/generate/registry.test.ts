import { describe, expect, it } from "vitest";

import { getAvailableNodeTypes, getAvailableNodes } from "./registry";

describe("registry", () => {
  it("returns all builtin node types from the workflow package", () => {
    const types = getAvailableNodeTypes();
    expect(types).toEqual(
      expect.arrayContaining(["noop", "http.request", "delay", "condition", "transform"]),
    );
  });

  it("returns nodes with JSON-shape input schemas", () => {
    const nodes = getAvailableNodes();
    const noop = nodes.find((n) => n.type === "noop");
    expect(noop).toBeDefined();
    expect(noop?.inputSchema).toMatchObject({ type: "object" });
  });

  it("is idempotent across calls", () => {
    const first = getAvailableNodeTypes().sort();
    const second = getAvailableNodeTypes().sort();
    expect(first).toEqual(second);
  });
});
