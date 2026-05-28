import { describe, expect, it } from "vitest";

import type { StepLog } from "../schema";
import * as stepLogQueries from "./stepLogs";
import { createMockDb } from "./_test-helpers";

const tenantId = "11111111-1111-1111-1111-111111111111";
const runId = "44444444-4444-4444-4444-444444444444";
const fixture: StepLog = {
  id: "55555555-5555-5555-5555-555555555555",
  runId,
  nodeId: "node-1",
  status: "completed",
  input: { foo: 1 },
  output: { bar: 2 },
  error: null,
  durationMs: "120",
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

describe("stepLogQueries.create", () => {
  it("returns the inserted step log", async () => {
    const { db, insert } = createMockDb({ insertResult: [fixture] });

    const result = await stepLogQueries.create(db, {
      runId,
      nodeId: "node-1",
      status: "completed",
      input: { foo: 1 },
      output: { bar: 2 },
    });

    expect(result).toEqual(fixture);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("throws when insert returns nothing", async () => {
    const { db } = createMockDb({ insertResult: [] });
    await expect(
      stepLogQueries.create(db, { runId, nodeId: "x", status: "pending" }),
    ).rejects.toThrow(/Failed to insert step log/);
  });
});

describe("stepLogQueries.findByRun", () => {
  it("returns step logs scoped through the run's tenant", async () => {
    const rows = [{ stepLog: fixture }];
    const { db, select } = createMockDb({ selectResult: rows });

    const result = await stepLogQueries.findByRun(db, { runId, tenantId });

    expect(result).toEqual([fixture]);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("returns empty array when no logs match (e.g. wrong tenant)", async () => {
    const { db } = createMockDb({ selectResult: [] });
    expect(
      await stepLogQueries.findByRun(db, {
        runId,
        tenantId: "00000000-0000-0000-0000-000000000000",
      }),
    ).toEqual([]);
  });
});
