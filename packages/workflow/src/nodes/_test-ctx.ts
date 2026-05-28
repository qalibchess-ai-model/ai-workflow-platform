import type { ExecutionContext, WorkflowState } from "../types";

export function makeCtx(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    runId: "00000000-0000-0000-0000-000000000001",
    workflowId: "00000000-0000-0000-0000-000000000002",
    tenantId: "00000000-0000-0000-0000-000000000003",
    nodeId: "node-1",
    state: {} as WorkflowState,
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    ...overrides,
  };
}
