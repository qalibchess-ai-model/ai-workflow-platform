import type { ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import { type WorkflowDefinition } from "@workflow/workflow";

import { anthropic, MODELS } from "../client";
import { observe } from "../observability";
import { createWorkflowTool } from "../tools/workflow-tool";
import { buildSystemBlocks, buildUserMessage } from "./messages";
import { getAvailableNodes, type AvailableNode } from "./registry";
import { validateGeneratedWorkflow } from "./validate";

export type GenerateInput = {
  userPrompt: string;
  availableNodes?: AvailableNode[];
};

export class WorkflowGenerationError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "WorkflowGenerationError";
  }
}

export const generateWorkflow = observe("generate-workflow")(async (
  input: GenerateInput,
): Promise<WorkflowDefinition> => {
  const nodes = input.availableNodes ?? getAvailableNodes();

  const response = await anthropic.messages.create({
    model: MODELS.sonnet,
    max_tokens: 4096,
    temperature: 0.2,
    system: buildSystemBlocks(nodes),
    tools: [createWorkflowTool],
    tool_choice: { type: "tool", name: createWorkflowTool.name },
    messages: [{ role: "user", content: buildUserMessage(input.userPrompt, nodes) }],
  });

  const toolUse = response.content.find(
    (block): block is ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new WorkflowGenerationError("Model did not call create_workflow tool", "NO_TOOL_USE");
  }

  const validation = validateGeneratedWorkflow(toolUse.input);
  if (!validation.ok) {
    throw new WorkflowGenerationError(
      `Generated workflow failed validation [${validation.code}]: ${validation.message}`,
      validation.code,
    );
  }
  return validation.workflow;
});
