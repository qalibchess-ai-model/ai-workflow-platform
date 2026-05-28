import Link from "next/link";
import { ArrowUpRight, Pencil, Plus, Sparkles } from "lucide-react";
import type { Run, Workflow } from "@workflow/db";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { RunButton } from "./run-button";

type ListItem = {
  workflow: Workflow;
  lastRun: Run | null;
};

type StatusVariant = "default" | "success" | "warning" | "destructive" | "secondary";

function statusVariant(status: Run["status"]): StatusVariant {
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

function statusDot(status: Run["status"]): string {
  switch (status) {
    case "completed":
      return "bg-success";
    case "failed":
      return "bg-destructive";
    case "running":
      return "bg-warning animate-pulse";
    case "cancelled":
      return "bg-muted-foreground";
    default:
      return "bg-muted-foreground/60";
  }
}

function formatTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("az-AZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function EmptyState(): React.JSX.Element {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-5 py-16 text-center">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse-accent rounded-full" />
          <div className="relative flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-h3 font-semibold">İlk workflow-u qur</h3>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Bir cümlə yaz, AI workflow-u qurub vizual redaktorda göstərsin.
          </p>
        </div>
        <Button asChild>
          <Link href="/workflows/new">
            <Plus className="size-4" />
            Workflow yarat
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function WorkflowList({ items }: { items: ListItem[] }): React.JSX.Element {
  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-4 stagger md:grid-cols-2 xl:grid-cols-3">
      {items.map(({ workflow, lastRun }) => (
        <Card key={workflow.id} className="group flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-h3 font-semibold">{workflow.name}</h3>
                </div>
                <p className="text-[12px] text-muted-foreground">v{workflow.version}</p>
              </div>
              {lastRun ? (
                <Badge variant={statusVariant(lastRun.status)} className="shrink-0">
                  <span className={`size-1.5 rounded-full ${statusDot(lastRun.status)}`} />
                  {lastRun.status}
                </Badge>
              ) : (
                <Badge variant="secondary" className="shrink-0">
                  <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                  yeni
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="mt-auto flex flex-col gap-4">
            <div className="text-[12px] text-muted-foreground">
              Son run:{" "}
              <span className="text-foreground/80">{formatTime(lastRun?.createdAt ?? null)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/workflows/${workflow.id}`}>
                  <Pencil className="size-3.5" />
                  Redaktə
                  <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
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
