import {
  WorkflowValidationError,
  validateWorkflow,
  type WorkflowDefinition,
} from "@workflow/workflow";

export type ValidationResult =
  | { ok: true; workflow: WorkflowDefinition }
  | { ok: false; code: string; message: string };

export function validateGeneratedWorkflow(input: unknown): ValidationResult {
  try {
    const workflow = validateWorkflow(input);
    return { ok: true, workflow };
  } catch (err) {
    if (err instanceof WorkflowValidationError) {
      return { ok: false, code: err.code, message: err.message };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, code: "UNKNOWN", message };
  }
}
