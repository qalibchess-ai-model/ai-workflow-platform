import type { WorkflowDefinition, WorkflowNode } from "./types";

export function topologicalOrder(def: WorkflowDefinition): WorkflowNode[] {
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const nodesById = new Map<string, WorkflowNode>();

  for (const node of def.nodes) {
    indegree.set(node.id, 0);
    adjacency.set(node.id, []);
    nodesById.set(node.id, node);
  }
  for (const edge of def.edges) {
    adjacency.get(edge.from)?.push(edge.to);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of indegree) {
    if (deg === 0) queue.push(id);
  }

  const ordered: WorkflowNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined) break;
    const node = nodesById.get(id);
    if (node) ordered.push(node);
    for (const next of adjacency.get(id) ?? []) {
      const deg = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  if (ordered.length !== def.nodes.length) {
    throw new Error("Cycle detected — call validateWorkflow before ordering");
  }
  return ordered;
}
