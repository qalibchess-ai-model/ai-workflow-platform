"use client";

import "@xyflow/react/dist/style.css";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import { Loader2, MousePointerClick, Save } from "lucide-react";
import type { WorkflowDefinition } from "@workflow/workflow";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveWorkflowAction } from "@/app/actions/save";

import { NODE_TYPES } from "./nodes";

type EditorProps = {
  workflowId?: string;
  initialName: string;
  definition: WorkflowDefinition;
};

type FlowNode = Node<{
  label: string;
  nodeType: string;
  params: Record<string, unknown>;
}>;

function layoutPosition(index: number, total: number): { x: number; y: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(total)));
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: col * 280 + 60, y: row * 180 + 60 };
}

function toFlowNodes(definition: WorkflowDefinition): FlowNode[] {
  return definition.nodes.map((node, index) => ({
    id: node.id,
    type: node.type in NODE_TYPES ? node.type : "default",
    position: node.position ?? layoutPosition(index, definition.nodes.length),
    data: {
      label: node.id,
      nodeType: node.type,
      params: node.params ?? {},
    },
  }));
}

function toFlowEdges(definition: WorkflowDefinition): Edge[] {
  return definition.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: edge.condition,
    animated: true,
  }));
}

function flowToDefinition(
  name: string,
  trigger: WorkflowDefinition["trigger"],
  nodes: FlowNode[],
  edges: Edge[],
): WorkflowDefinition {
  return {
    name,
    trigger,
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data.nodeType,
      params: node.data.params,
      position: { x: node.position.x, y: node.position.y },
    })),
    edges: edges.map((edge, idx) => ({
      id: edge.id ?? `e-${idx}`,
      from: edge.source,
      to: edge.target,
      condition: typeof edge.label === "string" ? edge.label : undefined,
    })),
  };
}

function NodeInspector({
  node,
  onChange,
}: {
  node: FlowNode;
  onChange: (next: FlowNode) => void;
}): React.JSX.Element {
  const [paramsText, setParamsText] = React.useState(() =>
    JSON.stringify(node.data.params, null, 2),
  );
  const [paramsError, setParamsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setParamsText(JSON.stringify(node.data.params, null, 2));
    setParamsError(null);
  }, [node.id, node.data.params]);

  return (
    <div className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border-subtle bg-surface p-5">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Inspector
        </div>
        <h3 className="mt-1 text-h3 font-semibold">{node.data.nodeType}</h3>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="node-id">Node ID</Label>
        <Input
          id="node-id"
          value={node.id}
          onChange={(e) => onChange({ ...node, id: e.target.value })}
          className="font-mono text-[13px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="node-type">Tip</Label>
        <Input
          id="node-type"
          value={node.data.nodeType}
          onChange={(e) =>
            onChange({
              ...node,
              type: e.target.value in NODE_TYPES ? e.target.value : "default",
              data: { ...node.data, nodeType: e.target.value },
            })
          }
          className="font-mono text-[13px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="node-params">Params (JSON)</Label>
        <Textarea
          id="node-params"
          className="h-56 font-mono text-[12px] leading-relaxed"
          value={paramsText}
          onChange={(e) => {
            setParamsText(e.target.value);
            try {
              const parsed = JSON.parse(e.target.value);
              if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                setParamsError(null);
                onChange({
                  ...node,
                  data: { ...node.data, params: parsed as Record<string, unknown> },
                });
              } else {
                setParamsError("JSON object olmalıdır");
              }
            } catch (err) {
              setParamsError(err instanceof Error ? err.message : "Yanlış JSON");
            }
          }}
        />
        {paramsError ? <p className="text-[12px] text-destructive">{paramsError}</p> : null}
      </div>
    </div>
  );
}

function InspectorEmpty(): React.JSX.Element {
  return (
    <div className="hidden w-80 shrink-0 flex-col items-center justify-center gap-3 border-l border-border-subtle bg-surface p-6 text-center md:flex">
      <div className="flex size-10 items-center justify-center rounded-full bg-hover text-muted-foreground">
        <MousePointerClick className="size-4" />
      </div>
      <p className="max-w-[200px] text-[12px] text-muted-foreground">
        Bir node seçin və ya kətanda boş sahəyə klik edib seçimi sıfırlayın.
      </p>
    </div>
  );
}

function EditorInner({ workflowId, initialName, definition }: EditorProps): React.JSX.Element {
  const router = useRouter();
  const [name, setName] = React.useState(initialName);
  const [trigger] = React.useState<WorkflowDefinition["trigger"]>(definition.trigger);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(toFlowNodes(definition));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toFlowEdges(definition));
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const flowRef = React.useRef<ReactFlowInstance<FlowNode, Edge> | null>(null);

  const selectedNode = React.useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  const handleConnect = React.useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `e-${connection.source}-${connection.target}-${eds.length}`,
            animated: true,
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const handleNodeUpdate = React.useCallback(
    (next: FlowNode) => {
      setNodes((cur) => cur.map((n) => (n.id === selectedId ? { ...next, id: next.id } : n)));
      setSelectedId(next.id);
    },
    [setNodes, selectedId],
  );

  const handleSave = React.useCallback(async () => {
    setSaving(true);
    setError(null);
    const def = flowToDefinition(name, trigger, nodes, edges);
    const res = await saveWorkflowAction({ id: workflowId, name, definition: def });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (!workflowId) {
      router.push(`/workflows/${res.id}`);
      return;
    }
    router.refresh();
  }, [name, trigger, nodes, edges, workflowId, router]);

  const onNodesChangeWrapped = React.useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      onNodesChange(changes);
      const removed = changes.find((c) => c.type === "remove");
      if (removed && selectedId && removed.id === selectedId) {
        setSelectedId(null);
      }
    },
    [onNodesChange, selectedId],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden animate-fade-in">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border-subtle bg-surface px-5">
        <div className="flex flex-1 items-center gap-3">
          <Label
            htmlFor="workflow-name"
            className="text-[11px] uppercase tracking-wider text-muted-foreground"
          >
            Workflow
          </Label>
          <Input
            id="workflow-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 max-w-md font-medium"
          />
          <div className="ml-2 hidden items-center gap-3 text-[12px] text-muted-foreground sm:flex">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" />
              {nodes.length} node
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-muted-foreground" />
              {edges.length} edge
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error ? <span className="text-[12px] text-destructive">{error}</span> : null}
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {workflowId ? "Yadda saxla" : "Yarat"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 bg-background">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChangeWrapped}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            onInit={(instance) => {
              flowRef.current = instance;
            }}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ animated: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="currentColor" />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              maskColor="hsl(var(--background) / 0.7)"
              nodeColor={() => "hsl(var(--muted-foreground))"}
            />
          </ReactFlow>
        </div>
        {selectedNode ? (
          <NodeInspector node={selectedNode} onChange={handleNodeUpdate} />
        ) : (
          <InspectorEmpty />
        )}
      </div>
    </div>
  );
}

export function WorkflowEditor(props: EditorProps): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <EditorInner {...props} />
    </ReactFlowProvider>
  );
}
