import { hasHandler, registerNode, type NodeHandler } from "@workflow/workflow";
import type { ZodTypeAny } from "zod";

import { listMessages, sendEmail } from "./actions";
import { ListMessagesInput, ListMessagesOutput, SendEmailInput, SendEmailOutput } from "./schemas";
import type { NodeDefinition } from "../noop/nodes";

export const GMAIL_SEND_TYPE = "gmail.send";
export const GMAIL_LIST_TYPE = "gmail.list";

const SendEmailParams = SendEmailInput.omit({ tenantId: true });
const ListMessagesParams = ListMessagesInput.omit({ tenantId: true });

export const gmailNodes: NodeDefinition[] = [
  {
    type: GMAIL_SEND_TYPE,
    category: "Email",
    label: "Send Email (Gmail)",
    description:
      "Send an email through the connected tenant's Gmail account. Requires the tenant to have an active Gmail connection in Nango.",
    inputSchema: SendEmailParams as ZodTypeAny,
    outputSchema: SendEmailOutput,
    handler: (input) => sendEmail(input) as Promise<unknown>,
  },
  {
    type: GMAIL_LIST_TYPE,
    category: "Email",
    label: "List Messages (Gmail)",
    description:
      "List Gmail messages for the connected tenant, optionally filtered by query (e.g. 'from:foo@bar.com is:unread').",
    inputSchema: ListMessagesParams as ZodTypeAny,
    outputSchema: ListMessagesOutput,
    handler: (input) => listMessages(input) as Promise<unknown>,
  },
];

const sendEmailHandler: NodeHandler = {
  type: GMAIL_SEND_TYPE,
  inputSchema: SendEmailParams,
  outputSchema: SendEmailOutput,
  execute: async (input, ctx) => {
    return sendEmail({ ...(input as object), tenantId: ctx.tenantId });
  },
};

const listMessagesHandler: NodeHandler = {
  type: GMAIL_LIST_TYPE,
  inputSchema: ListMessagesParams,
  outputSchema: ListMessagesOutput,
  execute: async (input, ctx) => {
    return listMessages({ ...(input as object), tenantId: ctx.tenantId });
  },
};

export const gmailHandlers: NodeHandler[] = [sendEmailHandler, listMessagesHandler];

export function registerGmailNodes(): void {
  for (const handler of gmailHandlers) {
    if (!hasHandler(handler.type)) {
      registerNode(handler);
    }
  }
}
