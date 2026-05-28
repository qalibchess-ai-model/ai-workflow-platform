import { describe, expect, it } from "vitest";

import type { Run } from "../schema";
import * as runQueries from "./runs";
import { createMockDb } from "./_test-helpers";

const tenantId = "11111111-1111-1111-1111-111111111111";
const workflowId = "22222222-2222-2222-2222-222222222222";
const fixture: Run = {
  id: "44444444-4444-4444-4444-444444444444",
  workflowId,
  tenantId,
  status: "pending",
  triggerData: { foo: "bar" },
  output: null,
  error: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

describe("runQueries.create", () => {
  it("returns the inserted run", async () => {
    const { db, insert } = createMockDb({ insertResult: [fixture] });

    const result = await runQueries.create(db, {
      workflowId,
      tenantId,
      triggerData: { foo: "bar" },
    });

    expect(result).toEqual(fixture);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("throws when insert returns no rows", async () => {
    const { db } = createMockDb({ insertResult: [] });
    await expect(runQueries.create(db, { workflowId, tenantId, triggerData: {} })).rejects.toThrow(
      /Failed to insert run/,
    );
  });
});

describe("runQueries.updateStatus", () => {
  it("returns the updated run", async () => {
    const updated: Run = { ...fixture, status: "completed" };
    const { db, update } = createMockDb({ updateResult: [updated] });

    const result = await runQueries.updateStatus(db, {
      id: fixture.id,
      tenantId,
      status: "completed",
      completedAt: new Date(),
    });

    expect(result).toEqual(updated);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("returns null when no row updated", async () => {
    const { db } = createMockDb({ updateResult: [] });
    const result = await runQueries.updateStatus(db, {
      id: fixture.id,
      tenantId: "00000000-0000-0000-0000-000000000000",
      status: "failed",
    });
    expect(result).toBeNull();
  });
});

describe("runQueries.findById", () => {
  it("returns the run", async () => {
    const { db } = createMockDb({ selectResult: [fixture] });
    expect(await runQueries.findById(db, { id: fixture.id, tenantId })).toEqual(fixture);
  });

  it("returns null when missing", async () => {
    const { db } = createMockDb({ selectResult: [] });
    expect(await runQueries.findById(db, { id: fixture.id, tenantId })).toBeNull();
  });
});

describe("runQueries.findByWorkflow", () => {
  it("returns runs for workflow", async () => {
    const rows = [fixture];
    const { db } = createMockDb({ selectResult: rows });
    expect(await runQueries.findByWorkflow(db, { workflowId, tenantId, limit: 10 })).toEqual(rows);
  });
});

describe("runQueries.listRecent", () => {
  it("returns recent runs for tenant", async () => {
    const rows = [fixture];
    const { db } = createMockDb({ selectResult: rows });
    expect(await runQueries.listRecent(db, { tenantId, limit: 5 })).toEqual(rows);
  });

  it("uses default limit when not provided", async () => {
    const { db } = createMockDb({ selectResult: [] });
    expect(await runQueries.listRecent(db, { tenantId })).toEqual([]);
  });
});
