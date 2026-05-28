export type MCPConnectionConfig = {
  id: string;
  serverUrl: string;
  apiKey?: string;
  tenantId: string;
};

export type MCPTool = {
  name: string;
  description?: string;
  inputSchema: unknown;
};

export type MCPNodeDefinition = {
  type: string;
  category: string;
  label: string;
  description?: string;
  inputSchema: unknown;
  tenantId: string;
  connectionId: string;
};
