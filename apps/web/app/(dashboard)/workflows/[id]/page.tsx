import { notFound } from "next/navigation";
import { workflowQueries } from "@workflow/db";
import { registerAllNodes } from "@workflow/integrations";
import { validateWorkflow } from "@workflow/workflow";

import { WorkflowEditor } from "@/components/workflow/workflow-editor";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

registerAllNodes();

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditWorkflowPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { tenantId } = await requireAuth();
  const { id } = await params;

  const workflow = await workflowQueries.findById(db, { id, tenantId });
  if (!workflow) {
    notFound();
  }

  const definition = validateWorkflow(workflow.definition);

  return (
    <WorkflowEditor workflowId={workflow.id} initialName={workflow.name} definition={definition} />
  );
}
