/**
 * Manual integration test: seed a workflow + run, dispatch the Inngest event,
 * poll for completion. Run with: pnpm tsx scripts/manual-workflow-test.ts
 *
 * Requires:
 *   - DATABASE_URL env
 *   - Worker running on PORT (default 8787)
 *   - Inngest CLI dev server running on http://localhost:8288
 */
import { randomUUID } from "node:crypto";
import { closeDb, getDb, runQueries, tenantQueries, workflowQueries } from "@workflow/db";

const INNGEST_DEV_URL = process.env.INNGEST_DEV_URL ?? "http://localhost:8288";

async function dispatchEvent(payload: {
  runId: string;
  workflowId: string;
  tenantId: string;
}): Promise<void> {
  const res = await fetch(`${INNGEST_DEV_URL}/e/dev-key`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "workflow/execute.requested",
      data: {
        runId: payload.runId,
        workflowId: payload.workflowId,
        tenantId: payload.tenantId,
        triggerData: { greeting: "hello from manual test" },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to dispatch event: ${res.status} ${await res.text()}`);
  }
}

async function pollRun(
  runId: string,
  tenantId: string,
  timeoutMs = 30_000,
): Promise<{ status: string; output: unknown; error: string | null }> {
  const db = getDb();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const run = await runQueries.findById(db, { id: runId, tenantId });
    if (run && (run.status === "completed" || run.status === "failed")) {
      return { status: run.status, output: run.output, error: run.error };
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Run ${runId} did not finish within ${timeoutMs}ms`);
}

async function main() {
  const db = getDb();

  const tenant = await tenantQueries.create(db, {
    name: `manual-test-${Date.now()}`,
  });

  const workflow = await workflowQueries.create(db, {
    tenantId: tenant.id,
    name: "manual-test-workflow",
    createdBy: "manual-test",
    definition: {
      name: "manual-test-workflow",
      trigger: { type: "manual" },
      nodes: [
        { id: "n1", type: "noop", params: { message: "hello" } },
        {
          id: "n2",
          type: "transform",
          params: {
            mapping: {
              greeting: "state.trigger.greeting",
              fromNoop: "state.n1.message",
            },
          },
        },
        {
          id: "n3",
          type: "condition",
          params: {
            expression: "state.n2.greeting === 'hello from manual test'",
            skipWhenFalse: ["n4"],
          },
        },
        { id: "n4", type: "noop", params: { message: "branch reached" } },
      ],
      edges: [
        { id: "e1", from: "n1", to: "n2" },
        { id: "e2", from: "n2", to: "n3" },
        { id: "e3", from: "n3", to: "n4" },
      ],
    },
  });

  const run = await runQueries.create(db, {
    workflowId: workflow.id,
    tenantId: tenant.id,
    status: "pending",
    triggerData: { greeting: "hello from manual test" },
  });

  console.info("seeded:", { tenantId: tenant.id, workflowId: workflow.id, runId: run.id });

  await dispatchEvent({ runId: run.id, workflowId: workflow.id, tenantId: tenant.id });
  console.info("event dispatched, polling…");

  const result = await pollRun(run.id, tenant.id);
  console.info("RESULT:", JSON.stringify(result, null, 2));

  await closeDb();

  if (result.status !== "completed") {
    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  console.error("FAILED:", err);
  process.exitCode = 1;
  void closeDb();
});
