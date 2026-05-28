import { hasHandler, registerNode, type NodeHandler } from "@workflow/workflow";
import type { ZodTypeAny } from "zod";

import { createPage, queryDatabase } from "./actions";
import {
  CreatePageInput,
  CreatePageOutput,
  NOTION_PROVIDER_KEY,
  QueryDatabaseInput,
  QueryDatabaseOutput,
} from "./schemas";
import { CredentialNotFoundError } from "../../credentials/resolve";
import type { NotionCredential } from "../../credentials/schemas";
import type { NodeDefinition } from "../noop/nodes";

export const NOTION_CREATE_PAGE_TYPE = "notion.createPage";
export const NOTION_QUERY_DATABASE_TYPE = "notion.queryDatabase";

const CreatePageParams = CreatePageInput.omit({ tenantId: true });
const QueryDatabaseParams = QueryDatabaseInput.omit({ tenantId: true });

export const notionNodes: NodeDefinition[] = [
  {
    type: NOTION_CREATE_PAGE_TYPE,
    category: "Productivity",
    label: "Create Notion Page",
    description:
      "Create a new page inside a Notion database. Properties must match the database schema. The API key is loaded from the tenant's stored Notion credential — workflow params must not contain it.",
    inputSchema: CreatePageParams as ZodTypeAny,
    outputSchema: CreatePageOutput,
    handler: () => {
      throw new Error(
        "notion.createPage requires an ExecutionContext to load API credentials; use the registered NodeHandler instead.",
      );
    },
  },
  {
    type: NOTION_QUERY_DATABASE_TYPE,
    category: "Productivity",
    label: "Query Notion Database",
    description:
      "Query rows of a Notion database with an optional filter. The API key is loaded from credentials.",
    inputSchema: QueryDatabaseParams as ZodTypeAny,
    outputSchema: QueryDatabaseOutput,
    handler: () => {
      throw new Error(
        "notion.queryDatabase requires an ExecutionContext to load API credentials; use the registered NodeHandler instead.",
      );
    },
  },
];

async function loadApiKey(ctx: Parameters<NodeHandler["execute"]>[1]): Promise<string> {
  if (!ctx.loadCredential) {
    throw new CredentialNotFoundError(NOTION_PROVIDER_KEY);
  }
  const credential = await ctx.loadCredential<NotionCredential>(NOTION_PROVIDER_KEY);
  return credential.apiKey;
}

const createPageHandler: NodeHandler = {
  type: NOTION_CREATE_PAGE_TYPE,
  inputSchema: CreatePageParams,
  outputSchema: CreatePageOutput,
  execute: async (input, ctx) => {
    const apiKey = await loadApiKey(ctx);
    return createPage({ ...(input as object), tenantId: ctx.tenantId }, apiKey);
  },
};

const queryDatabaseHandler: NodeHandler = {
  type: NOTION_QUERY_DATABASE_TYPE,
  inputSchema: QueryDatabaseParams,
  outputSchema: QueryDatabaseOutput,
  execute: async (input, ctx) => {
    const apiKey = await loadApiKey(ctx);
    return queryDatabase({ ...(input as object), tenantId: ctx.tenantId }, apiKey);
  },
};

export const notionHandlers: NodeHandler[] = [createPageHandler, queryDatabaseHandler];

export function registerNotionNodes(): void {
  for (const handler of notionHandlers) {
    if (!hasHandler(handler.type)) {
      registerNode(handler);
    }
  }
}
