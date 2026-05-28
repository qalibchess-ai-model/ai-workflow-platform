import { z } from "zod";

export const NodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  params: z.record(z.unknown()).default({}),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
});

export const EdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  condition: z.string().optional(),
});

export const TriggerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("manual") }),
  z.object({ type: z.literal("schedule"), cron: z.string().min(1) }),
  z.object({ type: z.literal("webhook"), path: z.string().min(1) }),
]);

export const WorkflowDefinitionSchema = z.object({
  name: z.string().min(1),
  trigger: TriggerSchema,
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type WorkflowNode = z.infer<typeof NodeSchema>;
export type WorkflowEdge = z.infer<typeof EdgeSchema>;
export type WorkflowTrigger = z.infer<typeof TriggerSchema>;

export type WorkflowState = Record<string, unknown>;

export type Logger = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export type ExecutionContext = {
  runId: string;
  workflowId: string;
  tenantId: string;
  nodeId: string;
  state: WorkflowState;
  logger: Logger;
};
