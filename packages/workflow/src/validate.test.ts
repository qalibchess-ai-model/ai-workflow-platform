import { beforeEach, describe, expect, it } from "vitest";

import { registerBuiltinNodes, resetRegistry } from "./nodes";
import { validateWorkflow, WorkflowValidationError } from "./validate";

const baseWorkflow = {
  name: "Test",
  trigger: { type: "manual" as const },
  nodes: [
    { id: "a", type: "noop", params: {} },
    { id: "b", type: "noop", params: {} },
  ],
  edges: [{ id: "e1", from: "a", to: "b" }],
};

beforeEach(() => {
  resetRegistry();
  registerBuiltinNodes();
});

describe("validateWorkflow", () => {
  it("accepts a valid linear workflow", () => {
    const def = validateWorkflow(baseWorkflow);
    expect(def.nodes).toHaveLength(2);
  });

  it("rejects circular dependencies", () => {
    const cyclic = {
      ...baseWorkflow,
      edges: [
        { id: "e1", from: "a", to: "b" },
        { id: "e2", from: "b", to: "a" },
      ],
    };
    expect(() => validateWorkflow(cyclic)).toThrow(WorkflowValidationError);
    try {
      validateWorkflow(cyclic);
    } catch (err) {
      expect((err as WorkflowValidationError).code).toBe("CYCLE_DETECTED");
    }
  });

  it("rejects edges that reference unknown nodes", () => {
    const broken = {
      ...baseWorkflow,
      edges: [{ id: "e1", from: "a", to: "ghost" }],
    };
    expect(() => validateWorkflow(broken)).toThrowError(/missing node/);
  });

  it("rejects unknown node types", () => {
    const unknown = {
      ...baseWorkflow,
      nodes: [{ id: "a", type: "not-registered", params: {} }],
      edges: [],
    };
    expect(() => validateWorkflow(unknown)).toThrowError(/Unknown node type/);
  });

  it("rejects duplicate node ids", () => {
    const dup = {
      ...baseWorkflow,
      nodes: [
        { id: "a", type: "noop", params: {} },
        { id: "a", type: "noop", params: {} },
      ],
      edges: [],
    };
    expect(() => validateWorkflow(dup)).toThrowError(/Duplicate node id/);
  });

  it("rejects malformed input shape", () => {
    expect(() => validateWorkflow({ name: "x" })).toThrowError(/Invalid workflow shape/);
  });
});
