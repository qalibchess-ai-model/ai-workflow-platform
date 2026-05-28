import { describe, expect, it } from "vitest";

import { topologicalOrder } from "./topology";
import type { WorkflowDefinition } from "./types";

describe("topologicalOrder", () => {
  it("orders nodes by edge dependencies", () => {
    const def: WorkflowDefinition = {
      name: "t",
      trigger: { type: "manual" },
      nodes: [
        { id: "c", type: "noop", params: {} },
        { id: "a", type: "noop", params: {} },
        { id: "b", type: "noop", params: {} },
      ],
      edges: [
        { id: "e1", from: "a", to: "b" },
        { id: "e2", from: "b", to: "c" },
      ],
    };
    const ordered = topologicalOrder(def).map((n) => n.id);
    expect(ordered.indexOf("a")).toBeLessThan(ordered.indexOf("b"));
    expect(ordered.indexOf("b")).toBeLessThan(ordered.indexOf("c"));
  });
});
