import { NonRetriableError } from "inngest";
import {
  CONDITION_NODE_TYPE,
  DELAY_NODE_TYPE,
  EVENT_WORKFLOW_EXECUTE_REQUESTED,
  WorkflowExecuteRequestedSchema,
  getHandler,
  interpolate,
  registerBuiltinNodes,
  topologicalOrder,
  validateWorkflow,
  type ExecutionContext,
  type WorkflowDefinition,
  type WorkflowNode,
  type WorkflowState,
} from "@workflow/workflow";
import { registerGmailNodes } from "@workflow/integrations";

import { inngest } from "../lib/inngest";
import {
  loadWorkflow,
  logStep,
  markRunCompleted,
  markRunFailed,
  markRunStarted,
} from "../lib/repository";

registerBuiltinNodes();
registerGmailNodes();

type DelayParams = { durationMs: number };

function parseDelayParams(node: WorkflowNode, state: WorkflowState): DelayParams {
  const handler = getHandler(DELAY_NODE_TYPE);
  const interpolated = interpolate(node.params, state);
  return handler.inputSchema.parse(interpolated) as DelayParams;
}

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: 3,
    concurrency: { limit: 10, key: "event.data.tenantId" },
  },
  { event: EVENT_WORKFLOW_EXECUTE_REQUESTED },
  async ({ event, step, logger }) => {
    const parsed = WorkflowExecuteRequestedSchema.safeParse(event.data);
    if (!parsed.success) {
      throw new NonRetriableError(`Invalid event payload: ${parsed.error.message}`);
    }
    const { runId, workflowId, tenantId, triggerData } = parsed.data;

    const workflow = await step.run("load-workflow", async () => {
      return loadWorkflow({ workflowId, tenantId });
    });

    const definition: WorkflowDefinition = await step.run("validate-workflow", async () => {
      try {
        return validateWorkflow(workflow.definition);
      } catch (err) {
        throw new NonRetriableError(
          err instanceof Error ? err.message : "Invalid workflow definition",
        );
      }
    });

    await step.run("mark-started", async () => {
      await markRunStarted({ runId, tenantId });
    });

    let state: WorkflowState = { trigger: triggerData };
    const skipped = new Set<string>();
    const order = topologicalOrder(definition);

    try {
      for (const node of order) {
        if (skipped.has(node.id)) {
          await step.run(`node-${node.id}-skipped`, async () => {
            await logStep({
              runId,
              nodeId: node.id,
              status: "cancelled",
              input: node.params,
            });
            logger.info({ msg: "node skipped", nodeId: node.id, workflowId, runId });
          });
          continue;
        }

        if (node.type === DELAY_NODE_TYPE) {
          const delayInput = parseDelayParams(node, state);
          await step.sleep(`node-${node.id}-sleep`, delayInput.durationMs);
          state = await step.run(`node-${node.id}`, async () => {
            await logStep({
              runId,
              nodeId: node.id,
              status: "completed",
              input: delayInput,
              output: { delayed: true, durationMs: delayInput.durationMs },
              durationMs: delayInput.durationMs,
            });
            return { ...state, [node.id]: { delayed: true, durationMs: delayInput.durationMs } };
          });
          continue;
        }

        state = await step.run(`node-${node.id}`, async () => {
          const handler = getHandler(node.type);
          const ctx: ExecutionContext = {
            runId,
            workflowId,
            tenantId,
            nodeId: node.id,
            state,
            logger,
          };

          const interpolated = interpolate(node.params, state);
          const input = handler.inputSchema.parse(interpolated);

          const startedAt = Date.now();
          try {
            const rawOutput = await handler.execute(input, ctx);
            const output = handler.outputSchema.parse(rawOutput);

            await logStep({
              runId,
              nodeId: node.id,
              status: "completed",
              input,
              output,
              durationMs: Date.now() - startedAt,
            });

            if (
              node.type === CONDITION_NODE_TYPE &&
              typeof output === "object" &&
              output !== null
            ) {
              const condOutput = output as { skip?: unknown };
              if (Array.isArray(condOutput.skip)) {
                for (const id of condOutput.skip) {
                  if (typeof id === "string") skipped.add(id);
                }
              }
            }

            return { ...state, [node.id]: output };
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            await logStep({
              runId,
              nodeId: node.id,
              status: "failed",
              input,
              error: message,
              durationMs: Date.now() - startedAt,
            });
            throw err;
          }
        });
      }

      await step.run("mark-completed", async () => {
        await markRunCompleted({ runId, tenantId, output: state });
      });

      return { runId, finalState: state };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await step.run("mark-failed", async () => {
        await markRunFailed({ runId, tenantId, error: message });
      });
      throw err;
    }
  },
);
