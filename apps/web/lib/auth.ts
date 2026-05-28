import "server-only";

import { auth } from "@clerk/nextjs/server";
import { tenantQueries } from "@workflow/db";

import { db } from "./db";

export type AuthContext = {
  userId: string;
  tenantId: string;
  clerkOrgId: string;
};

export async function requireAuth(): Promise<AuthContext> {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }
  if (!orgId) {
    throw new Error("ORGANIZATION_REQUIRED");
  }

  const existing = await tenantQueries.findByClerkOrgId(db, orgId);
  if (existing) {
    return { userId, tenantId: existing.id, clerkOrgId: orgId };
  }

  const created = await tenantQueries.create(db, {
    name: orgSlug ?? orgId,
    clerkOrgId: orgId,
  });
  return { userId, tenantId: created.id, clerkOrgId: orgId };
}
