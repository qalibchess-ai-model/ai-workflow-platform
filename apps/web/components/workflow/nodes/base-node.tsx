"use client";

import * as React from "react";
import { Handle, Position } from "@xyflow/react";

import { cn } from "@/lib/utils";

export type BaseNodeProps = {
  title: string;
  icon: React.ReactNode;
  /** Tailwind text color class for icon background */
  accentClass?: string;
  selected?: boolean;
  showTarget?: boolean;
  showSource?: boolean;
  children?: React.ReactNode;
};

export function BaseNode({
  title,
  icon,
  accentClass = "bg-muted text-muted-foreground",
  selected,
  showTarget = true,
  showSource = true,
  children,
}: BaseNodeProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "min-w-[220px] max-w-[280px] rounded-lg border bg-surface text-card-foreground",
        "transition-all duration-150",
        selected ? "border-primary shadow-ring-accent" : "border-border-subtle hover:border-border",
      )}
    >
      {showTarget && (
        <Handle
          type="target"
          position={Position.Top}
          className="!size-2 !border-2 !border-background !bg-muted-foreground"
        />
      )}
      <div className="flex items-center gap-2.5 border-b border-border-subtle px-3 py-2.5">
        <div className={cn("flex size-7 items-center justify-center rounded-md", accentClass)}>
          {icon}
        </div>
        <span className="truncate text-[13px] font-medium">{title}</span>
      </div>
      {children ? (
        <div className="space-y-1 px-3 py-2.5 text-[11px] text-muted-foreground">{children}</div>
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
      <span className="shrink-0 font-medium text-foreground/60">{label}:</span>
      <span className="truncate font-mono text-[10.5px]" title={value}>
        {value}
      </span>
    </div>
  );
}
