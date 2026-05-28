import {
  WorkflowDefinitionSchema,
  type WorkflowDefinition,
  type WorkflowEdge,
  type WorkflowNode,
} from "./types";
import { hasHandler } from "./nodes/registry";

export class WorkflowValidationError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "WorkflowValidationError";
  }
}

export function validateWorkflow(input: unknown): WorkflowDefinition {
  const parsed = WorkflowDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    throw new WorkflowValidationError(
      `Invalid workflow shape: ${parsed.error.message}`,
      "INVALID_SHAPE",
    );
  }
  const def = parsed.data;

  assertUniqueNodeIds(def.nodes);
  assertKnownNodeTypes(def.nodes);
  assertEdgeEndpointsExist(def.nodes, def.edges);
  assertNoCycles(def.nodes, def.edges);

  return def;
}

function assertUniqueNodeIds(nodes: WorkflowNode[]): void {
  const seen = new Set<string>();
  for (const node of nodes) {
    if (seen.has(node.id)) {
      throw new WorkflowValidationError(
        `Duplicate node id: ${node.id}`,
        "DUPLICATE_NODE_ID",
      );
    }
    seen.add(node.id);
  }
}

function assertKnownNodeTypes(nodes: WorkflowNode[]): void {
  for (const node of nodes) {
    if (!hasHandler(node.type)) {
      throw new WorkflowValidationError(
        `Unknown node type "${node.type}" for node "${node.id}"`,
        "UNKNOWN_NODE_TYPE",
      );
    }
  }
}

function assertEdgeEndpointsExist(nodes: WorkflowNode[], edges: WorkflowEdge[]): void {
  const ids = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    if (!ids.has(edge.from)) {
      throw new WorkflowValidationError(
        `Edge ${edge.id} references missing node "${edge.from}"`,
        "MISSING_EDGE_ENDPOINT",
      );
    }
    if (!ids.has(edge.to)) {
      throw new WorkflowValidationError(
        `Edge ${edge.id} references missing node "${edge.to}"`,
        "MISSING_EDGE_ENDPOINT",
      );
    }
  }
}

function assertNoCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): void {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.id, []);
  for (const edge of edges) {
    const targets = adjacency.get(edge.from);
    if (targets) targets.push(edge.to);
  }

  const visited = new Set<string>();
  const stack = new Set<string>();

  const visit = (id: string): void => {
    if (stack.has(id)) {
      throw new WorkflowValidationError(
        `Cycle detected at node "${id}"`,
        "CYCLE_DETECTED",
      );
    }
    if (visited.has(id)) return;
    stack.add(id);
    const neighbours = adjacency.get(id) ?? [];
    for (const next of neighbours) visit(next);
    stack.delete(id);
    visited.add(id);
  };

  for (const node of nodes) visit(node.id);
}
