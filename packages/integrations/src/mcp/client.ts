import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

import type { MCPConnectionConfig, MCPTool } from "./types";

export type MCPConnection = {
  client: Client;
  tools: MCPTool[];
};

export async function connectMCPServer(
  config: MCPConnectionConfig,
): Promise<MCPConnection> {
  const transport = new SSEClientTransport(new URL(config.serverUrl), {
    requestInit: config.apiKey
      ? { headers: { Authorization: `Bearer ${config.apiKey}` } }
      : undefined,
  });

  const client = new Client(
    { name: "ai-workflow-platform", version: "1.0.0" },
    { capabilities: {} },
  );

  await client.connect(transport);

  const { tools } = await client.listTools();
  return { client, tools: tools as MCPTool[] };
}
