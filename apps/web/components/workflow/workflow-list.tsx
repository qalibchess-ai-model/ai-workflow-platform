import Link from "next/link";
import { Pencil } from "lucide-react";
import type { Run, Workflow } from "@workflow/db";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { RunButton } from "./run-button";

type ListItem = {
  workflow: Workflow;
  lastRun: Run | null;
};

function statusVariant(
  status: Run["status"],
): "default" | "success" | "warning" | "destructive" | "secondary" {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "destructive";
    case "running":
      return "warning";
    case "cancelled":
      return "secondary";
    default:
      return "default";
  }
}

function formatTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("az-AZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function WorkflowList({ items }: { items: ListItem[] }): React.JSX.Element {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-muted-foreground">Hələ heç bir workflow yoxdur.</p>
          <Button asChild>
            <Link href="/workflows/new">İlk workflow-u yarat</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map(({ workflow, lastRun }) => (
        <Card key={workflow.id} className="flex flex-col">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="truncate text-lg">{workflow.name}</CardTitle>
                <CardDescription>v{workflow.version}</CardDescription>
              </div>
              {lastRun ? (
                <Badge variant={statusVariant(lastRun.status)}>{lastRun.status}</Badge>
              ) : (
                <Badge variant="outline">no runs</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="mt-auto space-y-3">
            <div className="text-xs text-muted-foreground">
              Son run: {formatTime(lastRun?.createdAt ?? null)}
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/workflows/${workflow.id}`}>
                  <Pencil className="size-4" />
                  Redaktə
                </Link>
              </Button>
              <RunButton workflowId={workflow.id} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
