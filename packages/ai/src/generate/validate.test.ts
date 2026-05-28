import { describe, expect, it } from "vitest";

import { registerBuiltinNodes } from "@workflow/workflow";

import { validateGeneratedWorkflow } from "./validate";

registerBuiltinNodes();

const validWorkflow = {
  name: "Sample",
  trigger: { type: "manual" },
  nodes: [{ id: "n1", type: "noop", params: {} }],
  edges: [],
};

describe("validateGeneratedWorkflow", () => {
  it("returns ok=true for a valid workflow", () => {
    const result = validateGeneratedWorkflow(validWorkflow);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.workflow.name).toBe("Sample");
    }
  });

  it("flags unknown node types", () => {
    const result = validateGeneratedWorkflow({
      ...validWorkflow,
      nodes: [{ id: "n1", type: "does-not-exist", params: {} }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNKNOWN_NODE_TYPE");
  });

  it("flags edges referencing missing nodes", () => {
    const result = validateGeneratedWorkflow({
      ...validWorkflow,
      edges: [{ id: "e1", from: "n1", to: "n-missing" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("MISSING_EDGE_ENDPOINT");
  });

  it("flags cycles", () => {
    const result = validateGeneratedWorkflow({
      ...validWorkflow,
      nodes: [
        { id: "a", type: "noop", params: {} },
        { id: "b", type: "noop", params: {} },
      ],
      edges: [
        { id: "e1", from: "a", to: "b" },
        { id: "e2", from: "b", to: "a" },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("CYCLE_DETECTED");
  });

  it("flags duplicate node IDs", () => {
    const result = validateGeneratedWorkflow({
      ...validWorkflow,
      nodes: [
        { id: "dup", type: "noop", params: {} },
        { id: "dup", type: "noop", params: {} },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("DUPLICATE_NODE_ID");
  });

  it("flags shape errors (zod)", () => {
    const result = validateGeneratedWorkflow({ name: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_SHAPE");
  });
});
