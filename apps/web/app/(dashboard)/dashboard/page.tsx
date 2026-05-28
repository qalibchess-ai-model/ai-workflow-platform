import Link from "next/link";
import { Plus } from "lucide-react";
import { runQueries, workflowQueries, type Run, type Workflow } from "@workflow/db";

import { Button } from "@/components/ui/button";
import { WorkflowList } from "@/components/workflow/workflow-list";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function loadWorkflowsWithRuns(
  tenantId: string,
): Promise<Array<{ workflow: Workflow; lastRun: Run | null }>> {
  const workflows = await workflowQueries.findByTenant(db, tenantId);
  return Promise.all(
    workflows.map(async (workflow) => {
      const recent = await runQueries.findByWorkflow(db, {
        workflowId: workflow.id,
        tenantId,
        limit: 1,
      });
      return { workflow, lastRun: recent[0] ?? null };
    }),
  );
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const { tenantId } = await requireAuth();
  const items = await loadWorkflowsWithRuns(tenantId);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-10 animate-fade-in">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-h1 font-semibold tracking-tight">Workflow-larım</h1>
          <p className="text-[13px] text-muted-foreground">
            {items.length === 0
              ? "Hələ heç bir workflow yoxdur."
              : `Cəmi ${items.length} workflow.`}
          </p>
        </div>
        <Button asChild>
          <Link href="/workflows/new">
            <Plus className="size-4" />
            Yeni workflow
          </Link>
        </Button>
      </div>

      <div className="mt-8">
        <WorkflowList items={items} />
      </div>
    </div>
  );
}
