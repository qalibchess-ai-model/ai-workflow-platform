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
  TELEGRAM_PROVIDER_KEY,
  SendMessageInput,
  SendMessageOutput,
  SendPhotoInput,
  SendPhotoOutput,
} from "./providers/telegram/schemas";
export { sendMessage, sendPhoto } from "./providers/telegram/actions";
export {
  telegramNodes,
  telegramHandlers,
  registerTelegramNodes,
  TELEGRAM_SEND_MESSAGE_TYPE,
  TELEGRAM_SEND_PHOTO_TYPE,
} from "./providers/telegram/nodes";

export {
  NOTION_PROVIDER_KEY,
  CreatePageInput,
  CreatePageOutput,
  QueryDatabaseInput,
  QueryDatabaseOutput,
} from "./providers/notion/schemas";
export { createPage, queryDatabase } from "./providers/notion/actions";
export {
  notionNodes,
  notionHandlers,
  registerNotionNodes,
  NOTION_CREATE_PAGE_TYPE,
  NOTION_QUERY_DATABASE_TYPE,
} from "./providers/notion/nodes";

export {
  SUPABASE_PROVIDER_KEY,
  SupabaseInsertInput,
  SupabaseInsertOutput,
  SupabaseSelectInput,
  SupabaseSelectOutput,
} from "./providers/supabase/schemas";
export { insertRow, selectRows } from "./providers/supabase/actions";
export type { SupabaseAuth } from "./providers/supabase/actions";
export {
  supabaseNodes,
  supabaseHandlers,
  registerSupabaseNodes,
  SUPABASE_INSERT_TYPE,
  SUPABASE_SELECT_TYPE,
} from "./providers/supabase/nodes";

export {
  SLACK_PROVIDER_KEY,
  SendMessageInput as SlackSendMessageInput,
  SendMessageOutput as SlackSendMessageOutput,
  UploadFileInput as SlackUploadFileInput,
  UploadFileOutput as SlackUploadFileOutput,
} from "./providers/slack/schemas";
export {
  sendMessage as slackSendMessage,
  uploadFile as slackUploadFile,
} from "./providers/slack/actions";
export {
  slackNodes,
  slackHandlers,
  registerSlackNodes,
  SLACK_SEND_MESSAGE_TYPE,
  SLACK_UPLOAD_FILE_TYPE,
} from "./providers/slack/nodes";

export {
  HUBSPOT_PROVIDER_KEY,
  CreateContactInput,
  CreateContactOutput,
  CreateDealInput,
  CreateDealOutput,
} from "./providers/hubspot/schemas";
export { createContact, createDeal } from "./providers/hubspot/actions";
export {
  hubspotNodes,
  hubspotHandlers,
  registerHubspotNodes,
  HUBSPOT_CREATE_CONTACT_TYPE,
  HUBSPOT_CREATE_DEAL_TYPE,
} from "./providers/hubspot/nodes";

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
