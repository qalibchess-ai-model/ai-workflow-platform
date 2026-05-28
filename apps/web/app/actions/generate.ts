"use server";

import { z } from "zod";
import { generateWorkflow, WorkflowGenerationError } from "@workflow/ai";
import type { WorkflowDefinition } from "@workflow/workflow";

import { requireAuth } from "@/lib/auth";

const InputSchema = z.object({
  prompt: z.string().min(8, "Prompt çox qısadır").max(4000, "Prompt çox uzundur"),
});

export type GenerateWorkflowResult =
  | { ok: true; workflow: WorkflowDefinition }
  | { ok: false; error: string; code?: string };

export async function generateWorkflowAction(
  input: z.infer<typeof InputSchema>,
): Promise<GenerateWorkflowResult> {
  await requireAuth();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Yanlış input" };
  }

  try {
    const workflow = await generateWorkflow({ userPrompt: parsed.data.prompt });
    return { ok: true, workflow };
  } catch (err) {
    if (err instanceof WorkflowGenerationError) {
      return { ok: false, error: err.message, code: err.code };
    }
    const message = err instanceof Error ? err.message : "Bilinməyən xəta";
    return { ok: false, error: message };
  }
}
