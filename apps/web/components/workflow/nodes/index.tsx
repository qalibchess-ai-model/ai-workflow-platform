"use client";

import * as React from "react";
import { Circle, Clock, GitBranch, Globe, Mail, Mailbox, Workflow, Wrench } from "lucide-react";
import type { NodeProps } from "@xyflow/react";

import { BaseNode, NodeField } from "./base-node";

type NodeData = {
  label?: string;
  nodeType: string;
  params: Record<string, unknown>;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function summarize(params: Record<string, unknown>, keys: string[]): React.JSX.Element {
  return (
    <>
      {keys.map((k) =>
        params[k] !== undefined ? (
          <NodeField key={k} label={k} value={formatValue(params[k])} />
        ) : null,
      )}
    </>
  );
}

export function HttpRequestNode({ data, selected }: NodeProps): React.JSX.Element {
  const d = data as unknown as NodeData;
  return (
    <BaseNode
      title={d.label ?? "HTTP Request"}
      icon={<Globe className="size-3.5" />}
      accentClass="bg-info/15 text-info"
      selected={selected}
    >
      {summarize(d.params, ["method", "url"])}
    </BaseNode>
  );
}

export function DelayNode({ data, selected }: NodeProps): React.JSX.Element {
  const d = data as unknown as NodeData;
  return (
    <BaseNode
      title={d.label ?? "Delay"}
      icon={<Clock className="size-3.5" />}
      accentClass="bg-warning/15 text-warning"
      selected={selected}
    >
      {summarize(d.params, ["durationMs"])}
    </BaseNode>
  );
}

export function ConditionNode({ data, selected }: NodeProps): React.JSX.Element {
  const d = data as unknown as NodeData;
  return (
    <BaseNode
      title={d.label ?? "Condition"}
      icon={<GitBranch className="size-3.5" />}
      accentClass="bg-warning/15 text-warning"
      selected={selected}
    >
      {summarize(d.params, ["expression"])}
    </BaseNode>
  );
}

export function TransformNode({ data, selected }: NodeProps): React.JSX.Element {
  const d = data as unknown as NodeData;
  return (
    <BaseNode
      title={d.label ?? "Transform"}
      icon={<Wrench className="size-3.5" />}
      accentClass="bg-success/15 text-success"
      selected={selected}
    >
      {summarize(d.params, ["expression"])}
    </BaseNode>
  );
}

export function NoopNode({ data, selected }: NodeProps): React.JSX.Element {
  const d = data as unknown as NodeData;
  return (
    <BaseNode
      title={d.label ?? "Noop"}
      icon={<Circle className="size-3.5" />}
      accentClass="bg-muted-foreground/15 text-muted-foreground"
      selected={selected}
    >
      <NodeField label="type" value={d.nodeType} />
    </BaseNode>
  );
}

export function GmailSendNode({ data, selected }: NodeProps): React.JSX.Element {
  const d = data as unknown as NodeData;
  return (
    <BaseNode
      title={d.label ?? "Gmail · Send"}
      icon={<Mail className="size-3.5" />}
      accentClass="bg-destructive/15 text-destructive"
      selected={selected}
    >
      {summarize(d.params, ["to", "subject"])}
    </BaseNode>
  );
}

export function GmailListNode({ data, selected }: NodeProps): React.JSX.Element {
  const d = data as unknown as NodeData;
  return (
    <BaseNode
      title={d.label ?? "Gmail · List"}
      icon={<Mailbox className="size-3.5" />}
      accentClass="bg-destructive/15 text-destructive"
      selected={selected}
    >
      {summarize(d.params, ["query", "maxResults"])}
    </BaseNode>
  );
}

export function DefaultNode({ data, selected }: NodeProps): React.JSX.Element {
  const d = data as unknown as NodeData;
  const keys = Object.keys(d.params).slice(0, 3);
  return (
    <BaseNode
      title={d.label ?? d.nodeType}
      icon={<Workflow className="size-3.5" />}
      accentClass="bg-primary/15 text-primary"
      selected={selected}
    >
      {summarize(d.params, keys)}
    </BaseNode>
  );
}

export const NODE_TYPES = {
  "http.request": HttpRequestNode,
  delay: DelayNode,
  condition: ConditionNode,
  transform: TransformNode,
  noop: NoopNode,
  "gmail.send": GmailSendNode,
  "gmail.list": GmailListNode,
  default: DefaultNode,
} as const;
