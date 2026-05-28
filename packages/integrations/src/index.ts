export { getNangoClient, nangoCall } from "./nango/client";
export { createConnectSession } from "./nango/connect";
export { verifyNangoSignature, parseNangoWebhook } from "./nango/webhook";
export type {
  ConnectSessionInput,
  ConnectSessionResult,
  HttpMethod,
  NangoCallParams,
  NangoWebhookEvent,
} from "./nango/types";

export { connectMCPServer } from "./mcp/client";
export type { MCPConnection } from "./mcp/client";
export {
  registerMCPTools,
  unregisterMCPConnection,
  listMCPNodes,
  getMCPNode,
} from "./mcp/registry";
export type { MCPConnectionConfig, MCPNodeDefinition, MCPTool } from "./mcp/types";

export { withRateLimit } from "./rate-limit";

export { noopNodes } from "./providers/noop/nodes";
export type { NodeDefinition } from "./providers/noop/nodes";

export {
  GMAIL_PROVIDER_KEY,
  SendEmailInput,
  SendEmailOutput,
  ListMessagesInput,
  ListMessagesOutput,
  GmailMessageRef,
} from "./providers/gmail/schemas";
export { sendEmail, listMessages } from "./providers/gmail/actions";
export {
  gmailNodes,
  gmailHandlers,
  registerGmailNodes,
  GMAIL_SEND_TYPE,
  GMAIL_LIST_TYPE,
} from "./providers/gmail/nodes";

export {
  IntegrationError,
  IntegrationConfigError,
  WebhookSignatureError,
  RateLimitError,
} from "./errors";

export {
  CREDENTIAL_PROVIDERS,
  CredentialNotFoundError,
  detectRequiredCredentials,
  describeRequiredCredentials,
  CustomCredentialSchema,
  HubspotCredentialSchema,
  NotionCredentialSchema,
  PROVIDER_CREDENTIAL_SCHEMAS,
  PROVIDER_METADATA,
  SlackCredentialSchema,
  SupabaseCredentialSchema,
  TelegramCredentialSchema,
  getCredentialSchema,
  isKnownProvider,
  parseCredentialValue,
  resolveCredential,
} from "./credentials";

export type { CredentialRequirement } from "./credentials";

export type {
  CredentialProvider,
  CustomCredential,
  HubspotCredential,
  NotionCredential,
  ProviderFieldSpec,
  ProviderMeta,
  SlackCredential,
  SupabaseCredential,
  TelegramCredential,
} from "./credentials";
