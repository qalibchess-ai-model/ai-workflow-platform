import { and, desc, eq } from "drizzle-orm";

import type { Database } from "../client";
import { workflows, type NewWorkflow, type Workflow } from "../schema";

export async function create(db: Database, input: NewWorkflow): Promise<Workflow> {
  const [row] = await db.insert(workflows).values(input).returning();
  if (!row) {
    throw new Error("Failed to insert workflow");
  }
  return row;
}

export async function findById(
  db: Database,
  params: { id: string; tenantId: string },
): Promise<Workflow | null> {
  const [row] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, params.id), eq(workflows.tenantId, params.tenantId)))
    .limit(1);
  return row ?? null;
}

export interface ListWorkflowsOptions {
  limit?: number;
  offset?: number;
}

export async function findByTenant(
  db: Database,
  tenantId: string,
  options: ListWorkflowsOptions = {},
): Promise<Workflow[]> {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  return db
    .select()
    .from(workflows)
    .where(eq(workflows.tenantId, tenantId))
    .orderBy(desc(workflows.updatedAt))
    .limit(limit)
    .offset(offset);
}

export type WorkflowUpdate = Partial<Pick<Workflow, "name" | "definition" | "version">>;

export async function update(
  db: Database,
  params: { id: string; tenantId: string; patch: WorkflowUpdate },
): Promise<Workflow | null> {
  const [row] = await db
    .update(workflows)
    .set({ ...params.patch, updatedAt: new Date() })
    .where(and(eq(workflows.id, params.id), eq(workflows.tenantId, params.tenantId)))
    .returning();
  return row ?? null;
}

export async function remove(
  db: Database,
  params: { id: string; tenantId: string },
): Promise<boolean> {
  const rows = await db
    .delete(workflows)
    .where(and(eq(workflows.id, params.id), eq(workflows.tenantId, params.tenantId)))
    .returning({ id: workflows.id });
  return rows.length > 0;
}
