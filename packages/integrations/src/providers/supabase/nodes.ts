import { hasHandler, registerNode, type NodeHandler } from "@workflow/workflow";
import type { ZodTypeAny } from "zod";

import { insertRow, selectRows, type SupabaseAuth } from "./actions";
import {
  SUPABASE_PROVIDER_KEY,
  SupabaseInsertInput,
  SupabaseInsertOutput,
  SupabaseSelectInput,
  SupabaseSelectOutput,
} from "./schemas";
import { CredentialNotFoundError } from "../../credentials/resolve";
import type { SupabaseCredential } from "../../credentials/schemas";
import type { NodeDefinition } from "../noop/nodes";

export const SUPABASE_INSERT_TYPE = "supabase.insert";
export const SUPABASE_SELECT_TYPE = "supabase.select";

const SupabaseInsertParams = SupabaseInsertInput.omit({ tenantId: true });
const SupabaseSelectParams = SupabaseSelectInput.omit({ tenantId: true });

export const supabaseNodes: NodeDefinition[] = [
  {
    type: SUPABASE_INSERT_TYPE,
    category: "Database",
    label: "Supabase Insert Row",
    description:
      "Insert one row (or a batch of rows) into a Supabase table. The project URL and service key are loaded from the tenant's stored Supabase credential — workflow params must not contain them.",
    inputSchema: SupabaseInsertParams as ZodTypeAny,
    outputSchema: SupabaseInsertOutput,
    handler: () => {
      throw new Error(
        "supabase.insert requires an ExecutionContext to load Supabase credentials; use the registered NodeHandler instead.",
      );
    },
  },
  {
    type: SUPABASE_SELECT_TYPE,
    category: "Database",
    label: "Supabase Select Rows",
    description:
      "Read rows from a Supabase table. Optional PostgREST filter (e.g. { id: 'eq.42' }) and limit. Credentials are loaded from the tenant's Supabase credential.",
    inputSchema: SupabaseSelectParams as ZodTypeAny,
    outputSchema: SupabaseSelectOutput,
    handler: () => {
      throw new Error(
        "supabase.select requires an ExecutionContext to load Supabase credentials; use the registered NodeHandler instead.",
      );
    },
  },
];

async function loadSupabaseAuth(ctx: Parameters<NodeHandler["execute"]>[1]): Promise<SupabaseAuth> {
  if (!ctx.loadCredential) {
    throw new CredentialNotFoundError(SUPABASE_PROVIDER_KEY);
  }
  const credential = await ctx.loadCredential<SupabaseCredential>(SUPABASE_PROVIDER_KEY);
  return { url: credential.url, serviceKey: credential.serviceKey };
}

const insertHandler: NodeHandler = {
  type: SUPABASE_INSERT_TYPE,
  inputSchema: SupabaseInsertParams,
  outputSchema: SupabaseInsertOutput,
  execute: async (input, ctx) => {
    const auth = await loadSupabaseAuth(ctx);
    return insertRow({ ...(input as object), tenantId: ctx.tenantId }, auth);
  },
};

const selectHandler: NodeHandler = {
  type: SUPABASE_SELECT_TYPE,
  inputSchema: SupabaseSelectParams,
  outputSchema: SupabaseSelectOutput,
  execute: async (input, ctx) => {
    const auth = await loadSupabaseAuth(ctx);
    return selectRows({ ...(input as object), tenantId: ctx.tenantId }, auth);
  },
};

export const supabaseHandlers: NodeHandler[] = [insertHandler, selectHandler];

export function registerSupabaseNodes(): void {
  for (const handler of supabaseHandlers) {
    if (!hasHandler(handler.type)) {
      registerNode(handler);
    }
  }
}
