import { eq, getDb, runs, workflows, type Run, type Workflow } from "@workflow/db";

export async function loadWorkflow(workflowId: string): Promise<Workflow> {
  const db = getDb();
  const rows = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
  const row = rows[0];
  if (!row) throw new Error(`Workflow not found: ${workflowId}`);
  return row;
}

export async function markRunStarted(runId: string): Promise<Run> {
  const db = getDb();
  const rows = await db
    .update(runs)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(runs.id, runId))
    .returning();
  const row = rows[0];
  if (!row) throw new Error(`Run not found: ${runId}`);
  return row;
}

export async function markRunCompleted(
  runId: string,
  output: Record<string, unknown>,
): Promise<void> {
  const db = getDb();
  await db
    .update(runs)
    .set({ status: "completed", output, completedAt: new Date() })
    .where(eq(runs.id, runId));
}

export async function markRunFailed(runId: string, error: string): Promise<void> {
  const db = getDb();
  await db
    .update(runs)
    .set({ status: "failed", error, completedAt: new Date() })
    .where(eq(runs.id, runId));
}
