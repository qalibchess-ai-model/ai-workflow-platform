import { hasHandler, registerNode, type NodeHandler } from "@workflow/workflow";
import type { ZodTypeAny } from "zod";

import { sendMessage, uploadFile } from "./actions";
import {
  SLACK_PROVIDER_KEY,
  SendMessageInput,
  SendMessageOutput,
  UploadFileInput,
  UploadFileOutput,
} from "./schemas";
import { CredentialNotFoundError } from "../../credentials/resolve";
import type { SlackCredential } from "../../credentials/schemas";
import type { NodeDefinition } from "../noop/nodes";

export const SLACK_SEND_MESSAGE_TYPE = "slack.sendMessage";
export const SLACK_UPLOAD_FILE_TYPE = "slack.uploadFile";

const SendMessageParams = SendMessageInput.omit({ tenantId: true });
const UploadFileParams = UploadFileInput.omit({ tenantId: true });

export const slackNodes: NodeDefinition[] = [
  {
    type: SLACK_SEND_MESSAGE_TYPE,
    category: "Messaging",
    label: "Send Slack Message",
    description:
      "Post a message to a Slack channel via the tenant's bot. The bot token is loaded from the tenant's stored Slack credential — workflow params must not contain it.",
    inputSchema: SendMessageParams as ZodTypeAny,
    outputSchema: SendMessageOutput,
    handler: () => {
      throw new Error(
        "slack.sendMessage requires an ExecutionContext to load bot credentials; use the registered NodeHandler instead.",
      );
    },
  },
  {
    type: SLACK_UPLOAD_FILE_TYPE,
    category: "Messaging",
    label: "Upload File to Slack",
    description:
      "Upload a file (by URL) to a Slack channel via the tenant's bot. The bot token is loaded from credentials.",
    inputSchema: UploadFileParams as ZodTypeAny,
    outputSchema: UploadFileOutput,
    handler: () => {
      throw new Error(
        "slack.uploadFile requires an ExecutionContext to load bot credentials; use the registered NodeHandler instead.",
      );
    },
  },
];

async function loadBotToken(ctx: Parameters<NodeHandler["execute"]>[1]): Promise<string> {
  if (!ctx.loadCredential) {
    throw new CredentialNotFoundError(SLACK_PROVIDER_KEY);
  }
  const credential = await ctx.loadCredential<SlackCredential>(SLACK_PROVIDER_KEY);
  return credential.botToken;
}

const sendMessageHandler: NodeHandler = {
  type: SLACK_SEND_MESSAGE_TYPE,
  inputSchema: SendMessageParams,
  outputSchema: SendMessageOutput,
  execute: async (input, ctx) => {
    const botToken = await loadBotToken(ctx);
    return sendMessage({ ...(input as object), tenantId: ctx.tenantId }, botToken);
  },
};

const uploadFileHandler: NodeHandler = {
  type: SLACK_UPLOAD_FILE_TYPE,
  inputSchema: UploadFileParams,
  outputSchema: UploadFileOutput,
  execute: async (input, ctx) => {
    const botToken = await loadBotToken(ctx);
    return uploadFile({ ...(input as object), tenantId: ctx.tenantId }, botToken);
  },
};

export const slackHandlers: NodeHandler[] = [sendMessageHandler, uploadFileHandler];

export function registerSlackNodes(): void {
  for (const handler of slackHandlers) {
    if (!hasHandler(handler.type)) {
      registerNode(handler);
    }
  }
}
