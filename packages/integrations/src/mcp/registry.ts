import type { MCPNodeDefinition, MCPTool } from "./types";

const registry = new Map<string, MCPNodeDefinition>();

function toolKey(connectionId: string, toolName: string): string {
  return `mcp.${connectionId}.${toolName}`;
}

export function registerMCPTools(opts: {
  connectionId: string;
  tenantId: string;
  tools: MCPTool[];
}): MCPNodeDefinition[] {
  const definitions: MCPNodeDefinition[] = [];

  for (const tool of opts.tools) {
    const definition: MCPNodeDefinition = {
      type: toolKey(opts.connectionId, tool.name),
      category: "MCP",
      label: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      tenantId: opts.tenantId,
      connectionId: opts.connectionId,
    };
    registry.set(definition.type, definition);
    definitions.push(definition);
  }

  return definitions;
}

export function unregisterMCPConnection(connectionId: string): void {
  const prefix = `mcp.${connectionId}.`;
  for (const key of registry.keys()) {
    if (key.startsWith(prefix)) registry.delete(key);
  }
}

export function listMCPNodes(tenantId?: string): MCPNodeDefinition[] {
  const nodes = Array.from(registry.values());
  if (!tenantId) return nodes;
  return nodes.filter((n) => n.tenantId === tenantId);
}

export function getMCPNode(type: string): MCPNodeDefinition | undefined {
  return registry.get(type);
}
