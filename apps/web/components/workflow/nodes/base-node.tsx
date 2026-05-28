"use client";

import * as React from "react";
import { Handle, Position } from "@xyflow/react";

import { cn } from "@/lib/utils";

export type BaseNodeProps = {
  title: string;
  icon: React.ReactNode;
  accent?: string;
  selected?: boolean;
  showTarget?: boolean;
  showSource?: boolean;
  children?: React.ReactNode;
};

export function BaseNode({
  title,
  icon,
  accent = "bg-slate-500",
  selected,
  showTarget = true,
  showSource = true,
  children,
}: BaseNodeProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "min-w-[220px] max-w-[280px] rounded-lg border bg-card text-card-foreground shadow-sm transition-all",
        selected && "ring-2 ring-primary ring-offset-2",
      )}
    >
      {showTarget && (
        <Handle
          type="target"
          position={Position.Top}
          className="!size-2 !border-2 !border-background !bg-muted-foreground"
        />
      )}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <div
          className={cn("flex size-6 items-center justify-center rounded-md text-white", accent)}
        >
          {icon}
        </div>
        <span className="text-sm font-medium truncate">{title}</span>
      </div>
      {children ? (
        <div className="px-3 py-2 text-xs text-muted-foreground space-y-1">{children}</div>
      ) : null}
      {showSource && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!size-2 !border-2 !border-background !bg-muted-foreground"
        />
      )}
    </div>
  );
}

export function NodeField({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-start gap-2">
      <span className="font-medium text-foreground/70 shrink-0">{label}:</span>
      <span className="truncate" title={value}>
        {value}
      </span>
    </div>
  );
}
