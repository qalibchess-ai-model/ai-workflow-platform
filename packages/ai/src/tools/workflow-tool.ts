import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { WorkflowDefinitionSchema } from "@workflow/workflow";
import { zodToJsonSchema } from "zod-to-json-schema";

const generated = zodToJsonSchema(WorkflowDefinitionSchema, {
  target: "openApi3",
  $refStrategy: "none",
}) as Record<string, unknown>;

const inputSchema: Tool.InputSchema = {
  type: "object",
  properties: generated.properties as Record<string, unknown> | undefined,
  required: generated.required as string[] | undefined,
};

export const createWorkflowTool: Tool = {
  name: "create_workflow",
  description: "Create a workflow from the user's natural language description",
  input_schema: inputSchema,
};
