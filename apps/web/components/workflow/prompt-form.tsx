"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { WorkflowDefinition } from "@workflow/workflow";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateWorkflowAction } from "@/app/actions/generate";

import { WorkflowEditor } from "./workflow-editor";

const PLACEHOLDER = 'Misal: "Hər gün səhər 9:00-da yeni xəbərlər haqqında Slack mesajı göndər"';

const SUGGESTIONS = [
  "Yeni Stripe ödənişini bildirim et",
  "Hər səhər Gmail-dən xülasə hazırla",
  "Webhook ilə Notion-a məlumat yaz",
];

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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-12 animate-fade-in">
      <div className="stagger space-y-8 w-full">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Sparkles className="size-3 text-primary" />
            AI-powered
          </div>
          <h1 className="text-h1 font-semibold tracking-tight">Workflow yarat</h1>
          <p className="text-[15px] text-muted-foreground">
            Təbii dildə təsvir verin — AI strukturlaşdırılmış workflow yaradacaq.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={6}
              disabled={loading}
              className="text-[15px] resize-none min-h-[160px] bg-surface"
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-surface/60 backdrop-blur-sm">
                <div className="flex items-center gap-2.5 text-[13px] text-primary">
                  <Loader2 className="size-4 animate-spin" />
                  AI workflow qurur...
                </div>
              </div>
            )}
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
              {error}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              Ən azı 8 simvol, maksimum 4000 simvol.
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="hidden flex-wrap items-center gap-2 sm:flex">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPrompt(s)}
                  disabled={loading}
                  className="rounded-full border border-border-subtle bg-surface px-3 py-1 text-[12px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
            <Button
              type="submit"
              disabled={loading || prompt.trim().length < 8}
              size="lg"
              className="ml-auto"
            >
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
    </div>
  );
}
