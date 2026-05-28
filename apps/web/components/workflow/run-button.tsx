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
      {error ? <span className="text-[11px] text-destructive">{error}</span> : null}
      <Button onClick={handleRun} disabled={pending} size="sm">
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
        Run
      </Button>
    </div>
  );
}
