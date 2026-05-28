export { anthropic, MODELS, type ModelName } from "./client";
export { langfuse, observe } from "./observability";
export { SYSTEM_PROMPT_V1 } from "./prompts/workflow-gen/system";
export { FEW_SHOT_EXAMPLES, type FewShotExample } from "./prompts/workflow-gen/examples";
export { WORKFLOW_GEN_PROMPT_VERSION } from "./prompts/workflow-gen/v1";
export { createWorkflowTool } from "./tools/workflow-tool";
export { generateWorkflow, type GenerateInput } from "./generate/workflow";

export const AI_PACKAGE_VERSION = "0.0.0";
