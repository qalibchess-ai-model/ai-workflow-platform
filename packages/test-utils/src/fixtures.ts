import { randomUUID } from "node:crypto";

export interface TestTenant {
  id: string;
  name: string;
}

export function createTestTenant(): TestTenant {
  return {
    id: randomUUID(),
    name: `test-tenant-${Date.now()}`,
  };
}

export interface TestWorkflowNode {
  id: string;
  type: string;
  params: Record<string, unknown>;
}

export interface TestWorkflowEdge {
  from: string;
  to: string;
}

export interface TestWorkflow {
  name: string;
  trigger: { type: "manual" | "schedule" | "webhook" };
  nodes: TestWorkflowNode[];
  edges: TestWorkflowEdge[];
}

export function createTestWorkflow(overrides: Partial<TestWorkflow> = {}): TestWorkflow {
  return {
    name: "Test Workflow",
    trigger: { type: "manual" },
    nodes: [{ id: "n1", type: "noop", params: {} }],
    edges: [],
    ...overrides,
  };
}
