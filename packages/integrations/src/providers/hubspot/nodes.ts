import { hasHandler, registerNode, type NodeHandler } from "@workflow/workflow";
import type { ZodTypeAny } from "zod";

import { createContact, createDeal } from "./actions";
import {
  CreateContactInput,
  CreateContactOutput,
  CreateDealInput,
  CreateDealOutput,
  HUBSPOT_PROVIDER_KEY,
} from "./schemas";
import { CredentialNotFoundError } from "../../credentials/resolve";
import type { HubspotCredential } from "../../credentials/schemas";
import type { NodeDefinition } from "../noop/nodes";

export const HUBSPOT_CREATE_CONTACT_TYPE = "hubspot.createContact";
export const HUBSPOT_CREATE_DEAL_TYPE = "hubspot.createDeal";

const CreateContactParams = CreateContactInput.omit({ tenantId: true });
const CreateDealParams = CreateDealInput.omit({ tenantId: true });

export const hubspotNodes: NodeDefinition[] = [
  {
    type: HUBSPOT_CREATE_CONTACT_TYPE,
    category: "CRM",
    label: "Create HubSpot Contact",
    description:
      "Create a contact in HubSpot using the tenant's stored Private App access token. The accessToken is loaded from credentials — workflow params must not contain it.",
    inputSchema: CreateContactParams as ZodTypeAny,
    outputSchema: CreateContactOutput,
    handler: () => {
      throw new Error(
        "hubspot.createContact requires an ExecutionContext to load credentials; use the registered NodeHandler instead.",
      );
    },
  },
  {
    type: HUBSPOT_CREATE_DEAL_TYPE,
    category: "CRM",
    label: "Create HubSpot Deal",
    description:
      "Create a deal in HubSpot using the tenant's stored Private App access token. The accessToken is loaded from credentials.",
    inputSchema: CreateDealParams as ZodTypeAny,
    outputSchema: CreateDealOutput,
    handler: () => {
      throw new Error(
        "hubspot.createDeal requires an ExecutionContext to load credentials; use the registered NodeHandler instead.",
      );
    },
  },
];

async function loadAccessToken(ctx: Parameters<NodeHandler["execute"]>[1]): Promise<string> {
  if (!ctx.loadCredential) {
    throw new CredentialNotFoundError(HUBSPOT_PROVIDER_KEY);
  }
  const credential = await ctx.loadCredential<HubspotCredential>(HUBSPOT_PROVIDER_KEY);
  return credential.accessToken;
}

const createContactHandler: NodeHandler = {
  type: HUBSPOT_CREATE_CONTACT_TYPE,
  inputSchema: CreateContactParams,
  outputSchema: CreateContactOutput,
  execute: async (input, ctx) => {
    const accessToken = await loadAccessToken(ctx);
    return createContact({ ...(input as object), tenantId: ctx.tenantId }, accessToken);
  },
};

const createDealHandler: NodeHandler = {
  type: HUBSPOT_CREATE_DEAL_TYPE,
  inputSchema: CreateDealParams,
  outputSchema: CreateDealOutput,
  execute: async (input, ctx) => {
    const accessToken = await loadAccessToken(ctx);
    return createDeal({ ...(input as object), tenantId: ctx.tenantId }, accessToken);
  },
};

export const hubspotHandlers: NodeHandler[] = [createContactHandler, createDealHandler];

export function registerHubspotNodes(): void {
  for (const handler of hubspotHandlers) {
    if (!hasHandler(handler.type)) {
      registerNode(handler);
    }
  }
}
