import { closeDb, getDb, stepLogQueries } from "@workflow/db";

const runId = process.argv[2];
const tenantId = process.argv[3];
if (!runId || !tenantId) {
  console.error("usage: tsx scripts/check-step-logs.ts <runId> <tenantId>");
  process.exit(1);
}

async function main() {
  const db = getDb();
  const logs = await stepLogQueries.findByRun(db, { runId: runId!, tenantId: tenantId! });
  console.info(
    JSON.stringify(
      logs.map((l) => ({
        nodeId: l.nodeId,
        status: l.status,
        durationMs: l.durationMs,
        hasInput: l.input !== null,
        hasOutput: l.output !== null,
      })),
      null,
      2,
    ),
  );
  await closeDb();
}

void main();
