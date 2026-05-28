import { z } from "zod";

export const WorkflowExecuteRequestedSchema = z.object({
  runId: z.string().uuid(),
  workflowId: z.string().uuid(),
  tenantId: z.string().uuid(),
  triggerData: z.record(z.unknown()).default({}),
});

export type WorkflowExecuteRequested = z.infer<typeof WorkflowExecuteRequestedSchema>;

export const EVENT_WORKFLOW_EXECUTE_REQUESTED = "workflow/execute.requested" as const;
