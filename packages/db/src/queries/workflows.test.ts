import { describe, expect, it } from "vitest";

import type { Workflow } from "../schema";
import * as workflowQueries from "./workflows";
import { createMockDb } from "./_test-helpers";

const tenantId = "11111111-1111-1111-1111-111111111111";
const fixture: Workflow = {
  id: "22222222-2222-2222-2222-222222222222",
  tenantId,
  name: "Onboarding",
  definition: { nodes: [], edges: [] },
  version: "1",
  createdBy: "user_1",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("workflowQueries.create", () => {
  it("returns the inserted workflow", async () => {
    const { db, insert } = createMockDb({ insertResult: [fixture] });

    const result = await workflowQueries.create(db, {
      tenantId,
      name: fixture.name,
      definition: fixture.definition,
      createdBy: fixture.createdBy,
    });

    expect(result).toEqual(fixture);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("throws when insert returns nothing", async () => {
    const { db } = createMockDb({ insertResult: [] });
    await expect(
      workflowQueries.create(db, {
        tenantId,
        name: "x",
        definition: {},
        createdBy: "u",
      }),
    ).rejects.toThrow(/Failed to insert workflow/);
  });
});

describe("workflowQueries.findById", () => {
  it("returns the workflow scoped to tenant", async () => {
    const { db } = createMockDb({ selectResult: [fixture] });
    expect(await workflowQueries.findById(db, { id: fixture.id, tenantId })).toEqual(fixture);
  });

  it("returns null when not found within tenant", async () => {
    const { db } = createMockDb({ selectResult: [] });
    expect(await workflowQueries.findById(db, { id: fixture.id, tenantId })).toBeNull();
  });
});

describe("workflowQueries.findByTenant", () => {
  it("returns workflows for tenant", async () => {
    const rows = [fixture, { ...fixture, id: "33333333-3333-3333-3333-333333333333" }];
    const { db } = createMockDb({ selectResult: rows });

    const result = await workflowQueries.findByTenant(db, tenantId);

    expect(result).toEqual(rows);
  });

  it("returns empty list when tenant has none", async () => {
    const { db } = createMockDb({ selectResult: [] });
    expect(await workflowQueries.findByTenant(db, tenantId)).toEqual([]);
  });
});

describe("workflowQueries.update", () => {
  it("returns the updated workflow", async () => {
    const updated = { ...fixture, name: "Renamed" };
    const { db, update } = createMockDb({ updateResult: [updated] });

    const result = await workflowQueries.update(db, {
      id: fixture.id,
      tenantId,
      patch: { name: "Renamed" },
    });

    expect(result).toEqual(updated);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("returns null when nothing updated (different tenant)", async () => {
    const { db } = createMockDb({ updateResult: [] });
    const result = await workflowQueries.update(db, {
      id: fixture.id,
      tenantId: "00000000-0000-0000-0000-000000000000",
      patch: { name: "Renamed" },
    });
    expect(result).toBeNull();
  });
});

describe("workflowQueries.remove", () => {
  it("returns true when a row was deleted", async () => {
    const { db, delete: del } = createMockDb({ deleteResult: [{ id: fixture.id }] });

    expect(await workflowQueries.remove(db, { id: fixture.id, tenantId })).toBe(true);
    expect(del).toHaveBeenCalledTimes(1);
  });

  it("returns false when no row matched", async () => {
    const { db } = createMockDb({ deleteResult: [] });
    expect(await workflowQueries.remove(db, { id: fixture.id, tenantId })).toBe(false);
  });
});
