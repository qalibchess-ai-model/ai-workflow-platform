import { and, asc, eq } from "drizzle-orm";

import type { Database } from "../client";
import { runs, stepLogs, type NewStepLog, type StepLog } from "../schema";

export async function create(db: Database, input: NewStepLog): Promise<StepLog> {
  const [row] = await db.insert(stepLogs).values(input).returning();
  if (!row) {
    throw new Error("Failed to insert step log");
  }
  return row;
}

export async function findByRun(
  db: Database,
  params: { runId: string; tenantId: string },
): Promise<StepLog[]> {
  const rows = await db
    .select({ stepLog: stepLogs })
    .from(stepLogs)
    .innerJoin(runs, eq(stepLogs.runId, runs.id))
    .where(and(eq(stepLogs.runId, params.runId), eq(runs.tenantId, params.tenantId)))
    .orderBy(asc(stepLogs.createdAt));
  return rows.map((row) => row.stepLog);
}
