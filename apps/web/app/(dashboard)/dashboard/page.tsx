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
    <div className="container py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workflow-larım</h1>
          <p className="text-sm text-muted-foreground">Cəmi {items.length} workflow.</p>
        </div>
        <Button asChild>
          <Link href="/workflows/new">
            <Plus className="size-4" />
            Yeni workflow
          </Link>
        </Button>
      </div>

      <div className="mt-6">
        <WorkflowList items={items} />
      </div>
    </div>
  );
}
