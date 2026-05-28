import { eq } from "drizzle-orm";

import type { Database } from "../client";
import { tenants, type NewTenant, type Tenant } from "../schema";

export async function create(db: Database, input: NewTenant): Promise<Tenant> {
  const [row] = await db.insert(tenants).values(input).returning();
  if (!row) {
    throw new Error("Failed to insert tenant");
  }
  return row;
}

export async function findById(db: Database, id: string): Promise<Tenant | null> {
  const [row] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return row ?? null;
}

export async function findByClerkOrgId(db: Database, clerkOrgId: string): Promise<Tenant | null> {
  const [row] = await db.select().from(tenants).where(eq(tenants.clerkOrgId, clerkOrgId)).limit(1);
  return row ?? null;
}
