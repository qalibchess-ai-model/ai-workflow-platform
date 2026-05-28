"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runQueries, workflowQueries } from "@workflow/db";
import { EVENT_WORKFLOW_EXECUTE_REQUESTED } from "@workflow/workflow";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { inngest } from "@/lib/inngest";

const RunInputSchema = z.object({
  workflowId: z.string().uuid(),
  triggerData: z.record(z.unknown()).default({}),
});

export type RunWorkflowResult = { ok: true; runId: string } | { ok: false; error: string };

export async function runWorkflowAction(
  input: z.infer<typeof RunInputSchema>,
): Promise<RunWorkflowResult> {
  const { tenantId } = await requireAuth();

  const parsed = RunInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Yanlış input" };
  }

  const workflow = await workflowQueries.findById(db, {
    id: parsed.data.workflowId,
    tenantId,
  });
  if (!workflow) {
    return { ok: false, error: "Workflow tapılmadı" };
  }

  const run = await runQueries.create(db, {
    workflowId: workflow.id,
    tenantId,
    status: "pending",
    triggerData: parsed.data.triggerData,
  });

  await inngest.send({
    name: EVENT_WORKFLOW_EXECUTE_REQUESTED,
    data: {
      runId: run.id,
      workflowId: workflow.id,
      tenantId,
      triggerData: parsed.data.triggerData,
    },
  });

  revalidatePath("/dashboard");
  return { ok: true, runId: run.id };
}
