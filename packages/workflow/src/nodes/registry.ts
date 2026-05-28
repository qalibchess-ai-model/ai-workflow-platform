import type { z } from "zod";

import type { ExecutionContext } from "../types";

export type NodeHandler<TInput = unknown, TOutput = unknown> = {
  type: string;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  execute: (input: TInput, ctx: ExecutionContext) => Promise<TOutput>;
};

const registry = new Map<string, NodeHandler>();

export function registerNode<TInput, TOutput>(handler: NodeHandler<TInput, TOutput>): void {
  if (registry.has(handler.type)) {
    throw new Error(`Node type already registered: ${handler.type}`);
  }
  registry.set(handler.type, handler as NodeHandler);
}

export function getHandler(type: string): NodeHandler {
  const handler = registry.get(type);
  if (!handler) throw new Error(`Unknown node type: ${type}`);
  return handler;
}

export function hasHandler(type: string): boolean {
  return registry.has(type);
}

export function listHandlers(): NodeHandler[] {
  return Array.from(registry.values());
}

export function resetRegistry(): void {
  registry.clear();
}
