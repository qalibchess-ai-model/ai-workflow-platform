import {
  registerGmailNodes,
  registerHubspotNodes,
  registerNotionNodes,
  registerSlackNodes,
  registerSupabaseNodes,
  registerTelegramNodes,
} from "@workflow/integrations";
import { listHandlers, registerBuiltinNodes } from "@workflow/workflow";
import { zodToJsonSchema } from "zod-to-json-schema";

export type AvailableNode = {
  type: string;
  inputSchema: Record<string, unknown>;
};

function ensureRegistered(): void {
  registerBuiltinNodes();
  registerGmailNodes();
  registerTelegramNodes();
  registerNotionNodes();
  registerSupabaseNodes();
  registerSlackNodes();
  registerHubspotNodes();
}

export function getAvailableNodes(): AvailableNode[] {
  ensureRegistered();
  return listHandlers().map((handler) => ({
    type: handler.type,
    inputSchema: zodToJsonSchema(handler.inputSchema, {
      target: "openApi3",
      $refStrategy: "none",
    }) as Record<string, unknown>,
  }));
}

export function getAvailableNodeTypes(): string[] {
  ensureRegistered();
  return listHandlers().map((handler) => handler.type);
}
