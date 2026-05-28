import { NonRetriableError } from "inngest";
import {
  EVENT_WORKFLOW_EXECUTE_REQUESTED,
  WorkflowExecuteRequestedSchema,
  getHandler,
  registerBuiltinNodes,
  topologicalOrder,
  validateWorkflow,
  type ExecutionContext,
  type WorkflowState,
} from "@workflow/workflow";

import { inngest } from "../lib/inngest";
import { loadWorkflow, markRunCompleted, markRunStarted } from "../lib/repository";

registerBuiltinNodes();

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: 3,
    concurrency: { limit: 10, key: "event.data.tenantId" },
  },
  { event: EVENT_WORKFLOW_EXECUTE_REQUESTED },
  async ({ event, step, logger }) => {
    const input = WorkflowExecuteRequestedSchema.safeParse(event.data);
    if (!input.success) {
      throw new NonRetriableError(`Invalid event payload: ${input.error.message}`);
    }
    const { runId, workflowId, tenantId, triggerData } = input.data;

    const workflow = await step.run("load-workflow", async () => {
      const row = await loadWorkflow(workflowId);
      if (row.tenantId !== tenantId) {
        throw new NonRetriableError("Tenant mismatch for workflow");
      }
      return row;
    });

    const definition = await step.run("validate-workflow", async () => {
      try {
        return validateWorkflow(workflow.definition);
      } catch (err) {
        throw new NonRetriableError(
          err instanceof Error ? err.message : "Invalid workflow definition",
        );
      }
    });

    await step.run("mark-started", async () => {
      await markRunStarted(runId);
    });

    const ctx: ExecutionContext = { runId, workflowId, tenantId, logger };

    let state: WorkflowState = { trigger: triggerData };

    for (const node of topologicalOrder(definition)) {
      state = await step.run(`node-${node.id}`, async () => {
        const handler = getHandler(node.type);
        const input = handler.inputSchema.parse(node.params);
        const output = await handler.execute(input, ctx);
        const parsedOutput = handler.outputSchema.parse(output);
        return {
          ...state,
          [node.id]: parsedOutput,
        };
      });
    }

    await step.run("mark-completed", async () => {
      await markRunCompleted(runId, state);
    });

    return { runId, finalState: state };
  },
);
