"use client";

import * as React from "react";
import { Loader2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { runWorkflowAction } from "@/app/actions/run";

export function RunButton({ workflowId }: { workflowId: string }): React.JSX.Element {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleRun(): void {
    setError(null);
    startTransition(async () => {
      const res = await runWorkflowAction({ workflowId, triggerData: {} });
      if (!res.ok) {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleRun} disabled={pending} size="sm" variant="secondary">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
        Run
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
