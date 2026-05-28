import type { MessageParam, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import type { WorkflowDefinition } from "@workflow/workflow";

import { anthropic, MODELS } from "../client";
import { observe } from "../observability";
import { createWorkflowTool } from "../tools/workflow-tool";
import { buildSystemBlocks, buildUserMessage } from "./messages";
import { getAvailableNodes, type AvailableNode } from "./registry";
import { validateGeneratedWorkflow } from "./validate";

export type SelfCorrectInput = {
  userPrompt: string;
  availableNodes?: AvailableNode[];
  maxAttempts?: number;
};

export type SelfCorrectResult = {
  workflow: WorkflowDefinition;
  attempts: number;
};

export class WorkflowSelfCorrectError extends Error {
  constructor(
    message: string,
    readonly attempts: number,
    readonly lastCode: string | null,
  ) {
    super(message);
    this.name = "WorkflowSelfCorrectError";
  }
}

const DEFAULT_MAX_ATTEMPTS = 3;

export const generateWorkflowWithCorrection = observe("generate-workflow-self-correct")(async (
  input: SelfCorrectInput,
): Promise<SelfCorrectResult> => {
  const max = Math.max(1, input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const nodes = input.availableNodes ?? getAvailableNodes();

  const systemBlocks = buildSystemBlocks(nodes);
  const messages: MessageParam[] = [
    { role: "user", content: buildUserMessage(input.userPrompt, nodes) },
  ];

  let lastCode: string | null = null;
  let lastMessage: string | null = null;

  for (let attempt = 1; attempt <= max; attempt++) {
    const response = await anthropic.messages.create({
      model: MODELS.sonnet,
      max_tokens: 4096,
      temperature: 0.2,
      system: systemBlocks,
      tools: [createWorkflowTool],
      tool_choice: { type: "tool", name: createWorkflowTool.name },
      messages,
    });

    const toolUse = response.content.find(
      (block): block is ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) {
      lastCode = "NO_TOOL_USE";
      lastMessage = "Model did not call create_workflow tool";
      break;
    }

    const validation = validateGeneratedWorkflow(toolUse.input);
    if (validation.ok) {
      return { workflow: validation.workflow, attempts: attempt };
    }

    lastCode = validation.code;
    lastMessage = validation.message;

    if (attempt < max) {
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: buildCorrectionPrompt(validation.code, validation.message),
            is_error: true,
          },
        ],
      });
    }
  }

  throw new WorkflowSelfCorrectError(
    `Workflow generation failed after ${max} attempt(s). Last error [${lastCode ?? "UNKNOWN"}]: ${lastMessage ?? "unknown"}`,
    max,
    lastCode,
  );
});

function buildCorrectionPrompt(code: string, message: string): string {
  return [
    `Yaratdığın workflow validation-dan keçmədi.`,
    `Xəta kodu: ${code}`,
    `Səbəb: ${message}`,
    "",
    "Zəhmət olmasa səhvi düzəlt və `create_workflow` tool-unu yenidən çağır.",
    "QAYDALARI XATIRLAT:",
    "- Yalnız sistem mesajında verilmiş mövcud node tiplərindən istifadə et",
    "- Edge-lərin from/to sahələri mövcud node ID-lərinə işarə etməlidir",
    "- Workflow-da heç bir döngü (cycle) olmamalıdır",
    "- Hər node ID unikal olmalıdır",
  ].join("\n");
}
