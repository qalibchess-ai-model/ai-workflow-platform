"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { WorkflowDefinition } from "@workflow/workflow";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateWorkflowAction } from "@/app/actions/generate";

import { WorkflowEditor } from "./workflow-editor";

const PLACEHOLDER = 'Misal: "Hər gün səhər 9:00-da yeni xəbərlər haqqında Slack mesajı göndər"';

export function PromptForm(): React.JSX.Element {
  const [prompt, setPrompt] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [workflow, setWorkflow] = React.useState<WorkflowDefinition | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await generateWorkflowAction({ prompt });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setWorkflow(result.workflow);
  }

  if (workflow) {
    return (
      <div className="flex flex-1 flex-col">
        <WorkflowEditor initialName={workflow.name} definition={workflow} />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-12">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Workflow yarat</h1>
        <p className="text-muted-foreground">
          Təbii dildə təsvir verin — AI strukturlaşdırılmış workflow yaradacaq.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={6}
          disabled={loading}
          className="text-base"
        />
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Ən azı 8 simvol, maksimum 4000 simvol.</p>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={loading || prompt.trim().length < 8} size="lg">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Generate
          </Button>
        </div>
      </form>
    </div>
  );
}
