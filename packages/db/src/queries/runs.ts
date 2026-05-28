import { and, desc, eq } from "drizzle-orm";

import type { Database } from "../client";
import { runs, type NewRun, type Run, type RunStatus } from "../schema";

export async function create(db: Database, input: NewRun): Promise<Run> {
  const [row] = await db.insert(runs).values(input).returning();
  if (!row) {
    throw new Error("Failed to insert run");
  }
  return row;
}

export interface UpdateStatusInput {
  id: string;
  tenantId: string;
  status: RunStatus;
  output?: unknown;
  error?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

export async function updateStatus(db: Database, input: UpdateStatusInput): Promise<Run | null> {
  const patch: Partial<Run> = { status: input.status };
  if (input.output !== undefined) patch.output = input.output;
  if (input.error !== undefined) patch.error = input.error;
  if (input.startedAt !== undefined) patch.startedAt = input.startedAt;
  if (input.completedAt !== undefined) patch.completedAt = input.completedAt;

  const [row] = await db
    .update(runs)
    .set(patch)
    .where(and(eq(runs.id, input.id), eq(runs.tenantId, input.tenantId)))
    .returning();
  return row ?? null;
}

export async function findById(
  db: Database,
  params: { id: string; tenantId: string },
): Promise<Run | null> {
  const [row] = await db
    .select()
    .from(runs)
    .where(and(eq(runs.id, params.id), eq(runs.tenantId, params.tenantId)))
    .limit(1);
  return row ?? null;
}

export interface FindByWorkflowOptions {
  limit?: number;
  offset?: number;
}

export async function findByWorkflow(
  db: Database,
  params: { workflowId: string; tenantId: string } & FindByWorkflowOptions,
): Promise<Run[]> {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  return db
    .select()
    .from(runs)
    .where(and(eq(runs.workflowId, params.workflowId), eq(runs.tenantId, params.tenantId)))
    .orderBy(desc(runs.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function listRecent(
  db: Database,
  params: { tenantId: string; limit?: number },
): Promise<Run[]> {
  const limit = params.limit ?? 20;
  return db
    .select()
    .from(runs)
    .where(eq(runs.tenantId, params.tenantId))
    .orderBy(desc(runs.createdAt))
    .limit(limit);
}
