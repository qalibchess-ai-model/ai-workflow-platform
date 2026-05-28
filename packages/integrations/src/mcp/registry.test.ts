import { afterEach, describe, expect, it } from "vitest";

import {
  getMCPNode,
  listMCPNodes,
  registerMCPTools,
  unregisterMCPConnection,
} from "./registry";

const TENANT = "tenant-1";
const CONNECTION = "conn-1";

afterEach(() => {
  unregisterMCPConnection(CONNECTION);
  unregisterMCPConnection("conn-2");
});

describe("MCP registry", () => {
  it("registers tools as scoped node definitions", () => {
    const defs = registerMCPTools({
      connectionId: CONNECTION,
      tenantId: TENANT,
      tools: [
        { name: "search", description: "Search", inputSchema: {} },
        { name: "fetch", description: "Fetch", inputSchema: {} },
      ],
    });
    expect(defs).toHaveLength(2);
    expect(defs[0]?.type).toBe(`mcp.${CONNECTION}.search`);
    expect(getMCPNode(`mcp.${CONNECTION}.fetch`)?.label).toBe("fetch");
  });

  it("filters by tenant", () => {
    registerMCPTools({
      connectionId: CONNECTION,
      tenantId: TENANT,
      tools: [{ name: "a", inputSchema: {} }],
    });
    registerMCPTools({
      connectionId: "conn-2",
      tenantId: "tenant-2",
      tools: [{ name: "b", inputSchema: {} }],
    });

    expect(listMCPNodes(TENANT)).toHaveLength(1);
    expect(listMCPNodes("tenant-2")).toHaveLength(1);
    expect(listMCPNodes()).toHaveLength(2);
  });

  it("unregisters all nodes for a connection", () => {
    registerMCPTools({
      connectionId: CONNECTION,
      tenantId: TENANT,
      tools: [
        { name: "a", inputSchema: {} },
        { name: "b", inputSchema: {} },
      ],
    });
    unregisterMCPConnection(CONNECTION);
    expect(listMCPNodes(TENANT)).toHaveLength(0);
  });
});
