import {
  getDb,
  runQueries,
  stepLogQueries,
  workflowQueries,
  type Run,
  type RunStatus,
  type StepLog,
  type Workflow,
} from "@workflow/db";

export async function loadWorkflow(params: {
  workflowId: string;
  tenantId: string;
}): Promise<Workflow> {
  const db = getDb();
  const row = await workflowQueries.findById(db, {
    id: params.workflowId,
    tenantId: params.tenantId,
  });
  if (!row) throw new Error(`Workflow not found: ${params.workflowId}`);
  return row;
}

export async function markRunStarted(params: { runId: string; tenantId: string }): Promise<Run> {
  const db = getDb();
  const row = await runQueries.updateStatus(db, {
    id: params.runId,
    tenantId: params.tenantId,
    status: "running",
    startedAt: new Date(),
  });
  if (!row) throw new Error(`Run not found: ${params.runId}`);
  return row;
}

export async function markRunCompleted(params: {
  runId: string;
  tenantId: string;
  output: Record<string, unknown>;
}): Promise<void> {
  const db = getDb();
  await runQueries.updateStatus(db, {
    id: params.runId,
    tenantId: params.tenantId,
    status: "completed",
    output: params.output,
    completedAt: new Date(),
  });
}

export async function markRunFailed(params: {
  runId: string;
  tenantId: string;
  error: string;
}): Promise<void> {
  const db = getDb();
  await runQueries.updateStatus(db, {
    id: params.runId,
    tenantId: params.tenantId,
    status: "failed",
    error: params.error,
    completedAt: new Date(),
  });
}

export interface LogStepInput {
  runId: string;
  nodeId: string;
  status: RunStatus;
  input?: unknown;
  output?: unknown;
  error?: string | null;
  durationMs?: number;
}

export async function logStep(input: LogStepInput): Promise<StepLog> {
  const db = getDb();
  return stepLogQueries.create(db, {
    runId: input.runId,
    nodeId: input.nodeId,
    status: input.status,
    input: input.input ?? null,
    output: input.output ?? null,
    error: input.error ?? null,
    durationMs: input.durationMs !== undefined ? String(input.durationMs) : null,
  });
}
