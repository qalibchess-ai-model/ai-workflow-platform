import { describe, expect, it } from "vitest";

import type { Tenant } from "../schema";
import * as tenantQueries from "./tenants";
import { createMockDb } from "./_test-helpers";

const fixture: Tenant = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Acme",
  clerkOrgId: "org_abc",
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

describe("tenantQueries.create", () => {
  it("inserts and returns the created tenant", async () => {
    const { db, insert } = createMockDb({ insertResult: [fixture] });

    const result = await tenantQueries.create(db, { name: "Acme" });

    expect(result).toEqual(fixture);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("throws when insert returns no rows", async () => {
    const { db } = createMockDb({ insertResult: [] });
    await expect(tenantQueries.create(db, { name: "Acme" })).rejects.toThrow(
      /Failed to insert tenant/,
    );
  });
});

describe("tenantQueries.findById", () => {
  it("returns the matched tenant", async () => {
    const { db, select } = createMockDb({ selectResult: [fixture] });

    const result = await tenantQueries.findById(db, fixture.id);

    expect(result).toEqual(fixture);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("returns null when no row matches", async () => {
    const { db } = createMockDb({ selectResult: [] });
    expect(await tenantQueries.findById(db, fixture.id)).toBeNull();
  });
});

describe("tenantQueries.findByClerkOrgId", () => {
  it("returns the matched tenant", async () => {
    const { db } = createMockDb({ selectResult: [fixture] });
    expect(await tenantQueries.findByClerkOrgId(db, "org_abc")).toEqual(fixture);
  });

  it("returns null when org is unknown", async () => {
    const { db } = createMockDb({ selectResult: [] });
    expect(await tenantQueries.findByClerkOrgId(db, "org_missing")).toBeNull();
  });
});
