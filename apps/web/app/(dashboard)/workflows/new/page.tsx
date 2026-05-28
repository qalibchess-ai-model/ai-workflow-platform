import { PromptForm } from "@/components/workflow/prompt-form";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewWorkflowPage(): Promise<React.JSX.Element> {
  await requireAuth();
  return <PromptForm />;
}
