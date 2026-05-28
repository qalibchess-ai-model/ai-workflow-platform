import { hasHandler, registerNode, type NodeHandler } from "@workflow/workflow";
import type { ZodTypeAny } from "zod";

import { sendMessage, sendPhoto } from "./actions";
import {
  SendMessageInput,
  SendMessageOutput,
  SendPhotoInput,
  SendPhotoOutput,
  TELEGRAM_PROVIDER_KEY,
} from "./schemas";
import { CredentialNotFoundError } from "../../credentials/resolve";
import type { TelegramCredential } from "../../credentials/schemas";
import type { NodeDefinition } from "../noop/nodes";

export const TELEGRAM_SEND_MESSAGE_TYPE = "telegram.sendMessage";
export const TELEGRAM_SEND_PHOTO_TYPE = "telegram.sendPhoto";

const SendMessageParams = SendMessageInput.omit({ tenantId: true });
const SendPhotoParams = SendPhotoInput.omit({ tenantId: true });

export const telegramNodes: NodeDefinition[] = [
  {
    type: TELEGRAM_SEND_MESSAGE_TYPE,
    category: "Messaging",
    label: "Send Telegram Message",
    description:
      "Send a text message to a Telegram chat through the tenant's bot. The bot token is loaded from the tenant's stored Telegram credential — workflow params must not contain it.",
    inputSchema: SendMessageParams as ZodTypeAny,
    outputSchema: SendMessageOutput,
    handler: () => {
      throw new Error(
        "telegram.sendMessage requires an ExecutionContext to load bot credentials; use the registered NodeHandler instead.",
      );
    },
  },
  {
    type: TELEGRAM_SEND_PHOTO_TYPE,
    category: "Messaging",
    label: "Send Telegram Photo",
    description:
      "Send a photo (by URL) to a Telegram chat through the tenant's bot. The bot token is loaded from credentials.",
    inputSchema: SendPhotoParams as ZodTypeAny,
    outputSchema: SendPhotoOutput,
    handler: () => {
      throw new Error(
        "telegram.sendPhoto requires an ExecutionContext to load bot credentials; use the registered NodeHandler instead.",
      );
    },
  },
];

async function loadBotToken(ctx: Parameters<NodeHandler["execute"]>[1]): Promise<string> {
  if (!ctx.loadCredential) {
    throw new CredentialNotFoundError(TELEGRAM_PROVIDER_KEY);
  }
  const credential = await ctx.loadCredential<TelegramCredential>(TELEGRAM_PROVIDER_KEY);
  return credential.botToken;
}

const sendMessageHandler: NodeHandler = {
  type: TELEGRAM_SEND_MESSAGE_TYPE,
  inputSchema: SendMessageParams,
  outputSchema: SendMessageOutput,
  execute: async (input, ctx) => {
    const botToken = await loadBotToken(ctx);
    return sendMessage({ ...(input as object), tenantId: ctx.tenantId }, botToken);
  },
};

const sendPhotoHandler: NodeHandler = {
  type: TELEGRAM_SEND_PHOTO_TYPE,
  inputSchema: SendPhotoParams,
  outputSchema: SendPhotoOutput,
  execute: async (input, ctx) => {
    const botToken = await loadBotToken(ctx);
    return sendPhoto({ ...(input as object), tenantId: ctx.tenantId }, botToken);
  },
};

export const telegramHandlers: NodeHandler[] = [sendMessageHandler, sendPhotoHandler];

export function registerTelegramNodes(): void {
  for (const handler of telegramHandlers) {
    if (!hasHandler(handler.type)) {
      registerNode(handler);
    }
  }
}
